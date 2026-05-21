import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const intervalMs = Math.max(
  60_000,
  Number(process.env.TICK_WATCH_INTERVAL_MS) || 10 * 60 * 1000
);

function runTick(label, args) {
  return new Promise((resolve) => {
    const child = spawn("node", ["scripts/cron-tick.mjs", ...args], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => {
      console.log(`[tick-watch] ${label} exit ${code ?? "?"}`);
      resolve();
    });
  });
}

async function cycle() {
  const at = new Date().toISOString();
  console.log(`\n[tick-watch] ${at} society tick`);
  await runTick("society", ["society", "--force"]);
}

console.log(
  `[tick-watch] 每 ${intervalMs / 60000} 分钟触发发帖+点赞+跟帖（需 npm run dev 在跑）`
);
await cycle();
setInterval(cycle, intervalMs);
