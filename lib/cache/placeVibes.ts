import { getRedis } from "./client";
import type { VibeTag } from "@/types/explore";

type CachedPlaceVibes = {
  tags: VibeTag[];
  updatedAt: string;
};

const PREFIX = "place-vibes:v1:";
const TTL = 60 * 60 * 24 * 14; // 14 days

function getKey(placeId: string): string {
  return `${PREFIX}${placeId}`;
}

export async function getCachedPlaceVibes(placeId: string): Promise<VibeTag[] | null> {
  const redis = getRedis();
  const cached = await redis.get<CachedPlaceVibes>(getKey(placeId));
  if (!cached || cached.tags.length === 0) return null;
  return cached.tags;
}

export async function setCachedPlaceVibes(placeId: string, tags: VibeTag[]): Promise<void> {
  const redis = getRedis();
  await redis.set(
    getKey(placeId),
    { tags, updatedAt: new Date().toISOString() } satisfies CachedPlaceVibes,
    { ex: TTL },
  );
}
