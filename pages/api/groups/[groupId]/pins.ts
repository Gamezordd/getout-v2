import type { NextApiRequest, NextApiResponse } from "next";
import {
  getGroupPins,
  addGroupPin,
  removeGroupPin,
  clearGroupPins,
} from "@/lib/cache/groupPins";
import { getGroupTravelCache, setGroupTravelCache } from "@/lib/cache/groupTravel";
import { getGroupLocationState } from "@/lib/cache/groupLocations";
import { fetchDistanceMatrix } from "@/lib/travel/distanceMatrix";
import { broadcastPinsUpdated } from "@/lib/pusher/server";
import type { GroupMember, PinnedPlace, Place } from "@/types/group";
import type { MemberTravel } from "@/types/travel";

type PinnedEntry = { place: Place; pinnedBy: GroupMember };

function entriesToPinnedPlaces(entries: PinnedEntry[]): PinnedPlace[] {
  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    votePercent: 0,
  }));
}

async function enrichWithTravel(
  groupId: string,
  pins: PinnedEntry[],
): Promise<PinnedPlace[]> {
  const pinsWithCoords = pins.filter((p) => p.place.coordinates != null);
  if (pinsWithCoords.length === 0) return entriesToPinnedPlaces(pins);

  const [locationState, cache] = await Promise.all([
    getGroupLocationState(groupId),
    getGroupTravelCache(groupId),
  ]);

  const members = locationState.preciseLocations;
  if (members.length === 0) return entriesToPinnedPlaces(pins);

  // Find (memberId, placeId) pairs missing from cache
  const uncachedMemberIds = new Set<string>();
  const uncachedPlaceIds = new Set<string>();
  for (const member of members) {
    for (const pin of pinsWithCoords) {
      if (!cache[member.memberId]?.[pin.place.id]) {
        uncachedMemberIds.add(member.memberId);
        uncachedPlaceIds.add(pin.place.id);
      }
    }
  }

  if (uncachedMemberIds.size > 0) {
    const origins = members.filter((m) => uncachedMemberIds.has(m.memberId));
    const dests = pinsWithCoords.filter((p) => uncachedPlaceIds.has(p.place.id));

    try {
      const matrix = await fetchDistanceMatrix(
        origins.map((m) => m.coordinates),
        dests.map((p) => p.place.coordinates!),
      );

      for (let i = 0; i < origins.length; i++) {
        const memberId = origins[i].memberId;
        if (!cache[memberId]) cache[memberId] = {};
        for (let j = 0; j < dests.length; j++) {
          const entry = matrix[i]?.[j];
          if (entry) cache[memberId][dests[j].place.id] = entry;
        }
      }

      await setGroupTravelCache(groupId, cache);
    } catch {
      // Travel enrichment failed — return pins without travel data
      return entriesToPinnedPlaces(pins);
    }
  }

  return pins.map((pin, index) => {
    const memberTravel: MemberTravel[] = [];
    for (const member of members) {
      const entry = cache[member.memberId]?.[pin.place.id];
      if (entry) {
        memberTravel.push({
          memberId: member.memberId,
          durationSeconds: entry.durationSeconds,
          distanceMeters: entry.distanceMeters,
        });
      }
    }
    return {
      ...pin,
      rank: index + 1,
      votePercent: 0,
      memberTravel: memberTravel.length > 0 ? memberTravel : undefined,
    };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = req.query.groupId;
  if (typeof groupId !== "string") {
    return res.status(400).json({ error: "Invalid group id" });
  }

  try {
    if (req.method === "GET") {
      const pins = await getGroupPins(groupId);
      const enriched = await enrichWithTravel(groupId, pins);
      return res.status(200).json({ data: enriched });
    }

    if (req.method === "POST") {
      const { place, pinnedBy } = req.body as { place?: Place; pinnedBy?: GroupMember };
      if (!place?.id || !pinnedBy?.id) {
        return res.status(400).json({ error: "place and pinnedBy are required" });
      }
      const pins = await addGroupPin(groupId, place, pinnedBy);
      await broadcastPinsUpdated(groupId);
      return res.status(200).json({ data: entriesToPinnedPlaces(pins) });
    }

    if (req.method === "DELETE") {
      const { placeId } = (req.body ?? {}) as { placeId?: string };
      if (placeId) {
        const pins = await removeGroupPin(groupId, placeId);
        await broadcastPinsUpdated(groupId);
        return res.status(200).json({ data: entriesToPinnedPlaces(pins) });
      }
      await clearGroupPins(groupId);
      await broadcastPinsUpdated(groupId);
      return res.status(200).json({ data: [] });
    }

    return res.status(405).end();
  } catch (error) {
    console.error("pins handler", error);
    return res.status(500).json({ error: "Failed to update pins" });
  }
}
