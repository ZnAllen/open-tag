import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 端口 + 代理目标从根 .env 读(worktree 各自 VITE_PORT/PORT 错开 → 多 worktree 的 vite 不撞、各代理到自己的 server)。
// vite cwd=web/,根 .env 在 ../;loadEnvFile 不覆盖 shell 已有变量。
try { (process as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.("../.env"); } catch { /* 无 .env 用默认 */ }
const API = `http://localhost:${process.env.PORT ?? 7777}`; // 代理到本 worktree 的 server
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_PORT ?? 5273),
    proxy: {
      "/api": { target: API, changeOrigin: true },
      "/socket.io": { target: API, ws: true, changeOrigin: true },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
