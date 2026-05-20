import type { NextApiRequest, NextApiResponse } from "next";
import { getGroup } from "@/lib/db/groups";
import { searchMapPlaces } from "@/lib/places/search";

function zoomToRadius(zoom: number): number {
  // zoom 10 → ~20000m, zoom 12 → ~5000m, zoom 14 → ~1250m, zoom 16 → ~310m
  return Math.max(200, Math.round(20000 / Math.pow(4, (zoom - 10) / 2)));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const groupId = req.query.groupId;
  if (typeof groupId !== "string") {
    return res.status(400).json({ error: "Invalid group id" });
  }

  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const zoom = parseFloat(req.query.zoom as string);
  const count =
    typeof req.query.count === "string" ? Number.parseInt(req.query.count, 10) : NaN;

  if (isNaN(lat) || isNaN(lng) || isNaN(zoom)) {
    return res.status(400).json({ error: "lat, lng, and zoom are required" });
  }

  try {
    const group = await getGroup(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const radiusMeters = zoomToRadius(zoom);
    const places = await searchMapPlaces({
      category: group.category,
      center: { lat, lng },
      radiusMeters,
      count: Number.isFinite(count) && count > 0 ? count : 20,
    });

    return res.status(200).json({ data: places, radiusMeters });
  } catch (error) {
    console.error("GET /api/groups/[groupId]/map-places", error);
    return res.status(500).json({ error: "Failed to fetch map places" });
  }
}
