import { spawn, type SpawnOptions, type ChildProcess } from "node:child_process";

export function spawnSafe(command: string, args: string[], options: SpawnOptions): ChildProcess {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", command, ...args], {
      ...options,
      windowsVerbatimArguments: true,
    });
  }
  return spawn(command, args, options);
}
