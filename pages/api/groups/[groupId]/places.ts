import type { NextApiRequest, NextApiResponse } from "next";
import { getGroup } from "@/lib/db/groups";
import {
  getGroupLocationState,
  setInitialGroupCentroid,
} from "@/lib/cache/groupLocations";
import {
  getApproximateLocationDebug,
  resolveApproximateLocation,
} from "@/lib/location/ip";
import { searchPlaces } from "@/lib/places/search";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") return res.status(405).end();

  const groupId = req.query.groupId;
  if (typeof groupId !== "string") {
    return res.status(400).json({ error: "Invalid group id" });
  }

  try {
    const [group, initialLocationState] = await Promise.all([
      getGroup(groupId),
      getGroupLocationState(groupId),
    ]);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    let locationState = initialLocationState;
    if (!locationState.centroid) {
      const approximateLocation = await resolveApproximateLocation(req);
      if (approximateLocation) {
        locationState = await setInitialGroupCentroid(groupId, approximateLocation);
      }
    }

    if (!locationState.centroid) {
      const debug = getApproximateLocationDebug(req);
      return res.status(400).json({
        error:
          "Group centroid unavailable. On localhost, allow a precise location first because browser IP geolocation is not available.",
        debug,
      });
    }

    const query =
      typeof req.query.q === "string" ? req.query.q : "";
    const count =
      typeof req.query.count === "string" ? Number.parseInt(req.query.count, 10) : NaN;

    const places = await searchPlaces({
      category: group.category,
      centroid: locationState.centroid.coordinates,
      query,
      count: Number.isFinite(count) && count > 0 ? count : 6,
    });

    return res.status(200).json({ data: places });
  } catch (error) {
    console.error("GET /api/groups/[groupId]/places", error);
    return res.status(500).json({ error: "Failed to search places" });
  }
}
