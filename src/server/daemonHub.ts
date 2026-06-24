// Connected local daemons (WS) → the serverId each one belongs to. core uses this to broadcast agent:start/deliver only to the daemons of that server.
// Each daemon connection is bound to one serverId by its machine key (/daemon/connect?key=); the server routes by connection and the daemon side just executes.
// (Connection contract verified stable across daemon versions.)
// Key to multi-tenant isolation: one machine connecting to multiple servers = multiple keys + multiple daemon processes; the server isolates by serverId so they never cross.
import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";

const daemons = new Map<WebSocket, string>(); // ws → the serverId this connection belongs to (registered by ws.ts after resolving the key)

export function registerDaemon(ws: WebSocket, serverId: string): void { daemons.set(ws, serverId); }
export function unregisterDaemon(ws: WebSocket): void { daemons.delete(ws); }
export function daemonCount(serverId: string): number {
  let n = 0; for (const sid of daemons.values()) if (sid === serverId) n++; return n;
}

export function broadcastToDaemons(serverId: string, msg: unknown): void {
  const data = JSON.stringify(msg);
  for (const [ws, sid] of daemons) {
    if (sid !== serverId) continue; // multi-tenant isolation: only send to this server's daemons, never cross to another server
    try { if (ws.readyState === 1) ws.send(data); } catch { /* ignore */ }
  }
}

// ── WS-RPC: send a request to this server's daemon and await the response carrying the same requestId (file tree/file content, etc.) ──
const pending = new Map<string, { resolve: (v: any) => void; timer: ReturnType<typeof setTimeout> }>();
export function requestDaemon(serverId: string, msg: Record<string, unknown>, timeoutMs = 6000): Promise<any> {
  if (daemonCount(serverId) === 0) return Promise.resolve({ error: "no daemon online" });
  const requestId = randomUUID();
  return new Promise((resolve) => {
    const timer = setTimeout(() => { pending.delete(requestId); resolve({ error: "daemon timeout" }); }, timeoutMs);
    pending.set(requestId, { resolve, timer });
    broadcastToDaemons(serverId, { ...msg, requestId }); // if several machines on the same server receive it, resolveDaemonRequest keeps the first to arrive by requestId
  });
}
export function resolveDaemonRequest(requestId: string, data: unknown): void {
  const p = pending.get(requestId);
  if (!p) return;
  clearTimeout(p.timer); pending.delete(requestId); p.resolve(data);
}
