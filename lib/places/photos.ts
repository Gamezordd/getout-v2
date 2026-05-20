import type { PlacePhoto } from "@/types/explore";

const PHOTO_LIMIT = 5;

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is missing");
  return key;
}

type PhotoMediaResponse = {
  photoUri?: string;
  authorAttributions?: Array<{ displayName?: string }>;
};

async function resolvePhoto(apiKey: string, photoName: string): Promise<PlacePhoto | null> {
  const res = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=1200&skipHttpRedirect=true&key=${encodeURIComponent(apiKey)}`,
  );
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as PhotoMediaResponse | null;
  if (typeof data?.photoUri !== "string") return null;
  return {
    url: data.photoUri,
    credit: data.authorAttributions?.[0]?.displayName ?? null,
  };
}

export async function fetchPlacePhotos(placeId: string): Promise<PlacePhoto[]> {
  const apiKey = getApiKey();

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos.name",
      },
    },
  );
  if (!res.ok) return [];

  const data = (await res.json().catch(() => null)) as {
    photos?: Array<{ name?: string }>;
  } | null;

  const photoNames = (data?.photos ?? [])
    .map((p) => (typeof p.name === "string" ? p.name.trim() : ""))
    .filter(Boolean)
    .slice(0, PHOTO_LIMIT);

  if (photoNames.length === 0) return [];

  const resolved = await Promise.all(photoNames.map((name) => resolvePhoto(apiKey, name)));
  return resolved.filter((p): p is PlacePhoto => p !== null);
}
