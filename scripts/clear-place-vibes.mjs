import { Redis } from "@upstash/redis";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PLACE_VIBES_PREFIX = "place-vibes:v1:";
const SCAN_COUNT = 200;
const BATCH_SIZE = 100;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const loadEnvFiles = () => {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(repoRoot, fileName);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) continue;
      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key]) continue;
      let value = line.slice(separatorIndex + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
};

const scanKeys = async (redis, match) => {
  const keys = [];
  let cursor = "0";
  do {
    const [nextCursor, batch] = await redis.scan(cursor, { match, count: SCAN_COUNT });
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
};

const deleteKeys = async (redis, keys) => {
  let deleted = 0;
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    if (batch.length > 0) deleted += await redis.del(...batch);
  }
  return deleted;
};

const main = async () => {
  loadEnvFiles();

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN.");
    process.exit(1);
  }

  const redis = new Redis({ url, token });

  console.log(`Scanning for keys matching "${PLACE_VIBES_PREFIX}*"…`);
  const keys = await scanKeys(redis, `${PLACE_VIBES_PREFIX}*`);

  if (keys.length === 0) {
    console.log("No place vibe cache entries found. Nothing to delete.");
    return;
  }

  console.log(`Found ${keys.length} key(s). Deleting…`);
  const deleted = await deleteKeys(redis, keys);
  console.log(`Deleted ${deleted} place vibe cache entry(s).`);
};

main().catch((error) => {
  console.error("Failed to clear place vibe cache.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
