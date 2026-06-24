import { defineConfig } from "drizzle-kit";
// 库地址来自 process.env.DATABASE_URL:dev 用 .env(drizzle-kit 自动加载);prod 走 `npm run db:push:prod`(先 source .env.prod 把 DATABASE_URL export 进 shell,drizzle 的 dotenv 不覆盖 shell 变量)。

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://fancy:fancy@localhost:5433/fancyloop",
  },
});
