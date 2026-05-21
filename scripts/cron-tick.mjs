import { readFileSync } from "fs";
import { resolve } from "path";

function loadCronSecret() {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  try {
    const raw = readFileSync(resolve(".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (key !== "CRON_SECRET") continue;
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      return val;
    }
  } catch {
    /* no .env.local */
  }
  return "local-dev-secret";
}

const kind = process.argv[2] === "conversation" ? "conversation" : "society";
const force = process.argv.includes("--force");
const path =
  kind === "conversation"
    ? "/api/cron/conversation-tick"
    : "/api/cron/society-tick";
const url = new URL(path, "http://localhost:3000");
if (force) url.searchParams.set("force", "1");

const secret = loadCronSecret();
const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
const text = await res.text();
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
if (!res.ok) process.exit(1);
