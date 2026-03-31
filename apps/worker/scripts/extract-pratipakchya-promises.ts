import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchPratipakchyaPromises } from "../src/sources/pratipakchya-promises";

function repoRootFromHere(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // apps/worker/scripts -> repo root
  return resolve(here, "..", "..", "..");
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const repoRoot = repoRootFromHere();
  const outJsonPath = resolve(repoRoot, "data", "pratipakchya", "promises.json");
  const rows = await fetchPratipakchyaPromises();
  if (rows === null) {
    console.log(`[extract-pratipakchya-promises] Not modified. Keeping existing ${outJsonPath}`);
    return;
  }
  await writeJson(outJsonPath, rows.map((r) => r.payload));
  console.log(`[extract-pratipakchya-promises] Extracted ${rows.length} records → ${outJsonPath}`);
}

main().catch((err) => {
  console.error("[extract-pratipakchya-promises]", err instanceof Error ? err.message : err);
  process.exit(1);
});

