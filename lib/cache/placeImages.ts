import { getRedis } from "./client";
import type { PlacePhoto } from "@/types/explore";

type CachedPlaceImages = {
  photos: PlacePhoto[];
  updatedAt: string;
};

const PLACE_IMAGES_PREFIX = "place-images:v2:";
const PLACE_IMAGES_TTL = 60 * 60 * 24 * 14; // 14 days

function getKey(placeId: string): string {
  return `${PLACE_IMAGES_PREFIX}${placeId}`;
}

export async function getCachedPlaceImages(placeId: string): Promise<PlacePhoto[] | null> {
  const redis = getRedis();
  const cached = await redis.get<CachedPlaceImages>(getKey(placeId));
  if (!cached || cached.photos.length === 0) return null;
  return cached.photos;
}

export async function setCachedPlaceImages(
  placeId: string,
  photos: PlacePhoto[],
): Promise<void> {
  const redis = getRedis();
  await redis.set(
    getKey(placeId),
    { photos, updatedAt: new Date().toISOString() } satisfies CachedPlaceImages,
    { ex: PLACE_IMAGES_TTL },
  );
}
