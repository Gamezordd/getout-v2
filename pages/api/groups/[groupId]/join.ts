import type { NextApiRequest, NextApiResponse } from "next";
import { joinGroup, getMembers, toPublicMember } from "@/lib/db/members";
import { getOrCreateBrowserId } from "@/lib/cookies";
import { saveGroupPreciseLocation } from "@/lib/cache/groupLocations";

type RequestBody = {
  preciseLocation?: {
    coordinates?: {
      lat?: unknown;
      lng?: unknown;
    };
  };
};

function parsePreciseCoordinates(body: RequestBody): { lat: number; lng: number } | null {
  const lat = body.preciseLocation?.coordinates?.lat;
  const lng = body.preciseLocation?.coordinates?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const groupId = req.query.groupId as string;
  try {
    const browserId = getOrCreateBrowserId(req, res);
    const member = await joinGroup(groupId, browserId);
    const preciseCoordinates = parsePreciseCoordinates(req.body as RequestBody);
    const locationState = preciseCoordinates
      ? await saveGroupPreciseLocation({
          groupId,
          memberId: member.id,
          browserId,
          coordinates: preciseCoordinates,
        })
      : null;
    const members = await getMembers(groupId);
    res.status(200).json({
      data: {
        members: members.map((m) => toPublicMember(m, browserId)),
        locationState,
      },
    });
  } catch (err) {
    console.error("POST /api/groups/[groupId]/join", err);
    res.status(500).json({ error: "Failed to join group" });
  }
}
