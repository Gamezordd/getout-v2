import type { NextApiRequest, NextApiResponse } from "next";
import { getBrowserIdFromCookie } from "@/lib/cookies";
import { getMemberByBrowserId } from "@/lib/db/members";
import { saveGroupPreciseLocation } from "@/lib/cache/groupLocations";
import { broadcastGroupEvent } from "@/lib/pusher/server";
import { EVENTS } from "@/lib/pusher/events";

type RequestBody = {
  coordinates?: {
    lat?: unknown;
    lng?: unknown;
  };
};

function parseCoordinates(body: RequestBody): { lat: number; lng: number } | null {
  const lat = body.coordinates?.lat;
  const lng = body.coordinates?.lng;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  const groupId = req.query.groupId;
  if (typeof groupId !== "string") {
    return res.status(400).json({ error: "Invalid group id" });
  }

  const coordinates = parseCoordinates(req.body as RequestBody);
  if (!coordinates) {
    return res.status(400).json({ error: "Invalid coordinates" });
  }

  const browserId = getBrowserIdFromCookie(req);
  if (!browserId) {
    return res.status(401).json({ error: "Missing browser id" });
  }

  try {
    const member = await getMemberByBrowserId(groupId, browserId);
    if (!member) {
      return res.status(404).json({ error: "Group member not found" });
    }

    const locationState = await saveGroupPreciseLocation({
      groupId,
      memberId: member.id,
      browserId,
      coordinates,
    });

    broadcastGroupEvent(groupId, EVENTS.CENTROID_UPDATED, { centroid: locationState.centroid }).catch(() => undefined);

    return res.status(200).json({ data: locationState });
  } catch (error) {
    console.error("POST /api/groups/[groupId]/location", error);
    return res.status(500).json({ error: "Failed to save precise location" });
  }
}
