import type { NextApiRequest, NextApiResponse } from "next";
import { getCachedPlaceVibes } from "@/lib/cache/placeVibes";
import type { PlaceVibesPayload } from "@/types/explore";

type PlaceRef = { id: string; name: string };

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function isValidPlaces(value: unknown): value is PlaceRef[] {
  return (
    Array.isArray(value) &&
    value.every(
      (p) => typeof (p as PlaceRef)?.id === "string" && typeof (p as PlaceRef)?.name === "string",
    )
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const groupId = req.query.groupId;
  if (typeof groupId !== "string") return res.status(400).json({ error: "Invalid group id" });

  const { places } = req.body as { places?: unknown };
  if (!isValidPlaces(places)) {
    return res.status(400).json({ error: "places must be an array of {id, name}" });
  }

  try {
    const result: PlaceVibesPayload = {};
    const uncached: PlaceRef[] = [];

    await Promise.all(
      places.map(async (place) => {
        const cached = await getCachedPlaceVibes(place.id);
        if (cached) {
          result[place.id] = cached;
        } else {
          result[place.id] = "loading";
          uncached.push(place);
        }
      }),
    );

    res.status(200).json({ data: result });

    if (uncached.length > 0) {
      fetch(`${getBaseUrl()}/api/groups/${groupId}/place-vibes-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ places: uncached }),
      }).catch(console.error);
    }
  } catch (error) {
    console.error("POST /api/groups/[groupId]/place-vibes", error);
    return res.status(500).json({ error: "Failed to fetch place vibes" });
  }
}
