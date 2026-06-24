// Redis: global monotonic seq counter + SSE realtime fan-out (pub/sub) + agent receive long-poll helper
import { Redis } from "ioredis"; // named import: under NodeNext the default import does not resolve the constructor signature (tsc TS2351)
import { max } from "drizzle-orm";
import { db, schema } from "./db/index.js";

const url = process.env.REDIS_URL ?? "redis://localhost:6380";
export const redis = new Redis(url);
export const pub = new Redis(url);
export const sub = new Redis(url);

/**
 * Startup alignment (durability guard): advances each server's Redis counters (seq / tasknum) to
 * at least the current Postgres maximum. Without this, if Redis loses data (flush / instance swap /
 * volume loss / eviction), INCR restarts from a low value → new message seq collides with existing
 * records, and seq < client lastSeq causes those messages to be silently dropped by /messages/sync.
 * Must complete before the server begins accepting connections (listen).
 */
export async function reconcileCounters(): Promise<{ servers: number; seqFixed: number; taskFixed: number }> {
  const seqRows = await db.select({ serverId: schema.messages.serverId, m: max(schema.messages.seq) }).from(schema.messages).groupBy(schema.messages.serverId);
  const taskRows = await db.select({ serverId: schema.messages.serverId, m: max(schema.messages.taskNumber) }).from(schema.messages).groupBy(schema.messages.serverId);
  let seqFixed = 0, taskFixed = 0;
  for (const r of seqRows) {
    const dbMax = Number(r.m ?? 0);
    const cur = Number((await redis.get(`seq:${r.serverId}`)) ?? 0);
    if (dbMax > cur) { await redis.set(`seq:${r.serverId}`, String(dbMax)); seqFixed++; }
  }
  for (const r of taskRows) {
    const dbMax = Number(r.m ?? 0);
    if (!dbMax) continue;
    const cur = Number((await redis.get(`tasknum:${r.serverId}`)) ?? 0);
    if (dbMax > cur) { await redis.set(`tasknum:${r.serverId}`, String(dbMax)); taskFixed++; }
  }
  return { servers: seqRows.length, seqFixed, taskFixed };
}

/** Global monotonic sequence number within a server (drives incremental sync). */
export function nextSeq(serverId: string): Promise<number> {
  return redis.incr(`seq:${serverId}`);
}

/** Monotonic task number within a server (task #N, incremented independently per server). */
export function nextTaskNumber(serverId: string): Promise<number> {
  return redis.incr(`tasknum:${serverId}`);
}

/** Broadcast an event to a server's realtime channel (SSE handler subscribes to events:{serverId}). */
export function publishEvent(serverId: string, event: unknown): Promise<number> {
  return pub.publish(`events:${serverId}`, JSON.stringify(event));
}

/** Wake an agent waiting on a receive long-poll (list push; consumed via BLPOP). */
export function pokeAgent(agentId: string): Promise<number> {
  return redis.rpush(`wake:${agentId}`, "1");
}
