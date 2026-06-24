// Initial seed data: one human (you) + the open-tag workspace + #all channel + one agent (ada)
import "../env.js"; // must be first: loads .env / ENV_FILE (.env.prod) → DATABASE_URL, before the db connection (required when running seed standalone)
import { db, schema, sql } from "./index.js";
import { eq } from "drizzle-orm";

async function main() {
  const { users, servers, serverMembers, agents, channels, channelMembers } = schema;

  // Idempotent, with a one-time migration for installs created before the default slug was renamed.
  const existing = await db.select().from(servers).where(eq(servers.slug, "open-tag"));
  if (existing.length) { console.log("[seed] open-tag workspace already exists, skipping"); await sql.end(); return; }
  const legacy = await db.select().from(servers).where(eq(servers.slug, "demo"));
  if (legacy.length) {
    await db.update(servers).set({ slug: "open-tag", name: "open-tag" }).where(eq(servers.id, legacy[0]!.id));
    console.log("[seed] migrated workspace slug demo -> open-tag");
    await sql.end();
    return;
  }

  const [you] = await db.insert(users).values({
    name: "you", displayName: "You", email: "you@open-tag.local",
  }).returning();

  const [server] = await db.insert(servers).values({
    name: "open-tag", slug: "open-tag", ownerId: you!.id, plan: "free",
  }).returning();

  await db.insert(serverMembers).values({ serverId: server!.id, userId: you!.id, role: "owner" });

  const [ada] = await db.insert(agents).values({
    serverId: server!.id, name: "ada", displayName: "Ada",
    description: "Your local full-stack assistant, capable of reading and writing files and running commands in its own workspace.",
    model: "sonnet", runtime: "claude",
  }).returning();

  const [all] = await db.insert(channels).values({
    serverId: server!.id, name: "all", description: "Channel for all members", type: "channel",
  }).returning();

  await db.insert(channelMembers).values([
    { channelId: all!.id, memberType: "user", memberId: you!.id },
    { channelId: all!.id, memberType: "agent", memberId: ada!.id },
  ]);

  console.log("[seed] done:");
  console.log("  server:", server!.id, "(slug=open-tag)");
  console.log("  user  :", you!.id, "(you)");
  console.log("  agent :", ada!.id, "(ada)");
  console.log("  channel #all:", all!.id);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
