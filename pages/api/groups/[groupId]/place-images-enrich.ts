import type { NextApiRequest, NextApiResponse } from "next";
import { getCachedPlaceImages, setCachedPlaceImages } from "@/lib/cache/placeImages";
import { fetchPlacePhotos } from "@/lib/places/photos";
import { broadcastGroupEvent } from "@/lib/pusher/server";
import { EVENTS } from "@/lib/pusher/events";
import type { PlacePhoto } from "@/types/explore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const groupId = req.query.groupId;
  if (typeof groupId !== "string") {
    return res.status(400).json({ error: "Invalid group id" });
  }

  const { placeIds } = req.body as { placeIds?: unknown };
  if (!Array.isArray(placeIds)) {
    return res.status(400).json({ error: "placeIds required" });
  }

  res.status(202).end();

  try {
    const updates: Array<{ placeId: string; photos: PlacePhoto[] }> = [];

    await Promise.all(
      placeIds.map(async (placeId: string) => {
        const cached = await getCachedPlaceImages(placeId);
        if (cached) {
          updates.push({ placeId, photos: cached });
          return;
        }
        const photos = await fetchPlacePhotos(placeId);
        if (photos.length > 0) {
          await setCachedPlaceImages(placeId, photos);
          updates.push({ placeId, photos });
        }
      }),
    );

    if (updates.length > 0) {
      await broadcastGroupEvent(groupId, EVENTS.PLACE_IMAGES_READY, { updates });
    }
  } catch (error) {
    console.error("place-images-enrich", error);
  }
}
