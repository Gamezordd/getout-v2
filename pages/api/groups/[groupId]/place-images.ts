import type { NextApiRequest, NextApiResponse } from "next";
import { getCachedPlaceImages } from "@/lib/cache/placeImages";
import type { PlaceImagesPayload } from "@/types/explore";

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const groupId = req.query.groupId;
  if (typeof groupId !== "string") {
    return res.status(400).json({ error: "Invalid group id" });
  }

  const { placeIds } = req.body as { placeIds?: unknown };
  if (!Array.isArray(placeIds) || placeIds.some((id) => typeof id !== "string")) {
    return res.status(400).json({ error: "placeIds must be a string array" });
  }

  try {
    const result: PlaceImagesPayload = {};
    const uncachedIds: string[] = [];

    await Promise.all(
      placeIds.map(async (placeId: string) => {
        const cached = await getCachedPlaceImages(placeId);
        if (cached) {
          result[placeId] = cached;
        } else {
          result[placeId] = "loading";
          uncachedIds.push(placeId);
        }
      }),
    );

    res.status(200).json({ data: result });

    if (uncachedIds.length > 0) {
      fetch(`${getBaseUrl()}/api/groups/${groupId}/place-images-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeIds: uncachedIds }),
      }).catch(console.error);
    }
  } catch (error) {
    console.error("POST /api/groups/[groupId]/place-images", error);
    return res.status(500).json({ error: "Failed to fetch place images" });
  }
}
