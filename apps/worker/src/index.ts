import { runReplay } from "./replay";

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const REPLAY_SPEED = Number(process.env.REPLAY_SPEED) || 10;

console.log("──────────────────────────────────────────");
console.log("  Nepal Intelligence OS — Replay Worker");
console.log("──────────────────────────────────────────");
console.log(`  API URL : ${API_URL}`);
console.log(`  Speed   : ${REPLAY_SPEED}x`);
console.log("──────────────────────────────────────────");

runReplay({ apiUrl: API_URL, speed: REPLAY_SPEED }).catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
