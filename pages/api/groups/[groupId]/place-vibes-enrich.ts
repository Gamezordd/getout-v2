import type { NextApiRequest, NextApiResponse } from "next";
import { getCachedPlaceVibes, setCachedPlaceVibes } from "@/lib/cache/placeVibes";
import { fetchPlaceVibeTags } from "@/lib/places/vibes";
import { broadcastGroupEvent } from "@/lib/pusher/server";
import { EVENTS } from "@/lib/pusher/events";
import type { VibeTag } from "@/types/explore";

type PlaceRef = { id: string; name: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const groupId = req.query.groupId;
  if (typeof groupId !== "string") return res.status(400).json({ error: "Invalid group id" });

  const { places } = req.body as { places?: unknown };
  if (!Array.isArray(places)) return res.status(400).json({ error: "places required" });

  res.status(202).end();

  try {
    const updates: Array<{ placeId: string; tags: VibeTag[] }> = [];

    await Promise.all(
      places.map(async (place: PlaceRef) => {
        const cached = await getCachedPlaceVibes(place.id);
        if (cached) {
          updates.push({ placeId: place.id, tags: cached });
          return;
        }
        const tags = await fetchPlaceVibeTags(place.id, place.name);
        if (tags) {
          await setCachedPlaceVibes(place.id, tags);
          updates.push({ placeId: place.id, tags });
        }
      }),
    );

    if (updates.length > 0) {
      await broadcastGroupEvent(groupId, EVENTS.PLACE_VIBES_READY, { updates });
    }
  } catch (error) {
    console.error("place-vibes-enrich", error);
  }
}
