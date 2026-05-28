import type { NextApiRequest, NextApiResponse } from "next";
import { createGroup } from "@/lib/db/groups";
import type { Category } from "@/types/group";
import { createSlugForGroup } from "@/lib/db/slugs";
import { joinGroup } from "@/lib/db/members";
import { getOrCreateBrowserId } from "@/lib/cookies";
import { resolveApproximateLocation } from "@/lib/location/ip";
import { saveGroupPreciseLocation, setInitialGroupCentroid } from "@/lib/cache/groupLocations";

type RequestBody = {
  category: unknown;
  preciseLocation?: {
    coordinates?: {
      lat?: unknown;
      lng?: unknown;
    };
  };
};

const VALID_CATEGORIES: Category[] = ["coffee", "alcohol", "food"];

function parsePreciseCoordinates(body: RequestBody): { lat: number; lng: number } | null {
  const lat = body.preciseLocation?.coordinates?.lat;
  const lng = body.preciseLocation?.coordinates?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const body = req.body as RequestBody;
  const { category } = body;
  if (!VALID_CATEGORIES.includes(category as Category)) {
    return res.status(400).json({ error: "Invalid category" });
  }
  try {
    const browserId = getOrCreateBrowserId(req, res);
    const group = await createGroup(category as Category);
    const [slug, member] = await Promise.all([
      createSlugForGroup(group.id),
      joinGroup(group.id, browserId),
    ]);
    const approximateLocation = await resolveApproximateLocation(req);
    console.log("Approximate location for new group:", approximateLocation);
    if (approximateLocation) {
      await setInitialGroupCentroid(group.id, approximateLocation);
    }

    const preciseCoordinates = parsePreciseCoordinates(body);
    const locationState = preciseCoordinates
      ? await saveGroupPreciseLocation({
          groupId: group.id,
          memberId: member.id,
          browserId,
          coordinates: preciseCoordinates,
        })
      : approximateLocation
        ? await setInitialGroupCentroid(group.id, approximateLocation)
        : null;

    res.status(200).json({ data: { slug, groupId: group.id, locationState } });
  } catch (err) {
    console.error("POST /api/groups", err);
    res.status(500).json({ error: "Failed to create group" });
  }
}
