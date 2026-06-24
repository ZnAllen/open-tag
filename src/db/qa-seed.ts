// QA 体验环境:全新干净 server(slug=qa)+ qa user(owner)+ 独立 machine(key)+ 2 个 claude agent + #general。
// qa 专属 daemon 用 QA_KEY 连(ws.ts:30 按 apiKeyHash 找到 qa server),与 demo(poc-secret-key)互不干扰。
// 跑:tsx src/db/qa-seed.ts  → 然后 tsx src/daemon/index.ts --server-url http://localhost:7777 --api-key qa-machine-key
import { db, schema, sql } from "./index.js";
import { hashToken } from "../server/auth.js";
import { eq, and } from "drizzle-orm";

export const QA_KEY = "qa-machine-key"; // qa daemon 连接用的 machine key

async function main() {
  const { users, servers, serverMembers, machines, agents, channels, channelMembers } = schema;
  const ex = await db.select().from(servers).where(eq(servers.slug, "qa"));
  if (ex.length) { console.log("[qa-seed] qa server 已存在,跳过(要重置先删 slug=qa 的 server)"); await sql.end(); return; }

  // qa user(dev-login ?as=qa 可能已建并加进了 demo;复用并移出 demo,确保只在 qa server)
  let qa = (await db.select().from(users).where(eq(users.name, "qa")))[0];
  if (!qa) qa = (await db.insert(users).values({ name: "qa", displayName: "QA", email: "qa@dev.local" }).returning())[0]!;
  const demo = (await db.select().from(servers).where(eq(servers.slug, "demo")))[0];
  if (demo) await db.delete(serverMembers).where(and(eq(serverMembers.userId, qa.id), eq(serverMembers.serverId, demo.id)));

  const [srv] = await db.insert(servers).values({ name: "QA 测试区", slug: "qa", ownerId: qa.id, plan: "free" }).returning();
  await db.insert(serverMembers).values({ serverId: srv!.id, userId: qa.id, role: "owner" });

  const [m] = await db.insert(machines).values({
    serverId: srv!.id, userId: qa.id, name: "qa-local",
    apiKeyHash: hashToken(QA_KEY), apiKeyPrefix: QA_KEY.slice(0, 14), runtimes: ["claude", "codex"],
  }).returning();

  const [cody] = await db.insert(agents).values({ serverId: srv!.id, machineId: m!.id, name: "cody", displayName: "Cody", description: "本机全栈助手,能读写工作区文件、跑命令", model: "sonnet", runtime: "claude" }).returning();
  const [ada] = await db.insert(agents).values({ serverId: srv!.id, machineId: m!.id, name: "ada", displayName: "Ada", description: "研究 & 写作助手", model: "sonnet", runtime: "claude" }).returning();

  const [gen] = await db.insert(channels).values({ serverId: srv!.id, name: "general", description: "主频道", type: "channel" }).returning();
  await db.insert(channelMembers).values([
    { channelId: gen!.id, memberType: "user", memberId: qa.id },
    { channelId: gen!.id, memberType: "agent", memberId: cody!.id },
    { channelId: gen!.id, memberType: "agent", memberId: ada!.id },
  ]);

  console.log("[qa-seed] 完成:");
  console.log("  server  :", srv!.id, "(slug=qa, 名='QA 测试区')");
  console.log("  user    :", qa.id, "(qa, owner)");
  console.log("  machine :", m!.id, "(key=" + QA_KEY + ")");
  console.log("  agents  : cody/ada (claude)");
  console.log("  channel : #general");
  console.log("  → 起 daemon: tsx src/daemon/index.ts --server-url http://localhost:7777 --api-key " + QA_KEY);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
