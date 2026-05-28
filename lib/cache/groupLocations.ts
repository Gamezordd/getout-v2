import { getRedis } from "./client";
import { reverseGeocodeCoordinates } from "@/lib/location/geocode";
import type { ApproximateLocation } from "@/lib/location/ip";
import type {
  Coordinates,
  GroupCentroid,
  GroupLocationState,
  GroupPreciseLocationEntry,
} from "@/types/location";

const GROUP_LOCATION_PREFIX = "group-location:";

function getGroupLocationKey(groupId: string): string {
  return `${GROUP_LOCATION_PREFIX}${groupId}`;
}

function getEmptyState(): GroupLocationState {
  return { centroid: null, preciseLocations: [] };
}

function averageCoordinates(locations: GroupPreciseLocationEntry[]): Coordinates {
  const total = locations.reduce(
    (sum, location) => ({
      lat: sum.lat + location.coordinates.lat,
      lng: sum.lng + location.coordinates.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: total.lat / locations.length,
    lng: total.lng / locations.length,
  };
}

function formatFallbackLabel(city: string | null, source: GroupCentroid["source"]): string {
  if (city) {
    return source === "precise" ? `Near ${city}` : city;
  }
  return source === "precise" ? "Precise group area" : "Approximate area";
}

export async function getGroupLocationState(
  groupId: string,
): Promise<GroupLocationState> {
  const redis = getRedis();
  const state = await redis.get<GroupLocationState>(getGroupLocationKey(groupId));
  return state ?? getEmptyState();
}

export async function setInitialGroupCentroid(
  groupId: string,
  approximateLocation: ApproximateLocation,
): Promise<GroupLocationState> {
  const existing = await getGroupLocationState(groupId);
  if (existing.centroid) return existing;

  const nextState: GroupLocationState = {
    centroid: {
      coordinates: approximateLocation.coordinates,
      source: "ip",
      label:
        approximateLocation.label ??
        formatFallbackLabel(approximateLocation.city, "ip"),
      city: approximateLocation.city,
      updatedAt: new Date().toISOString(),
    },
    preciseLocations: existing.preciseLocations,
  };

  const redis = getRedis();
  await redis.set(getGroupLocationKey(groupId), nextState);
  return nextState;
}

export async function saveGroupPreciseLocation(params: {
  groupId: string;
  memberId: string;
  browserId: string;
  coordinates: Coordinates;
}): Promise<GroupLocationState> {
  const current = await getGroupLocationState(params.groupId);
  const capturedAt = new Date().toISOString();
  const geocodedLocation = await reverseGeocodeCoordinates(params.coordinates);

  const nextLocation: GroupPreciseLocationEntry = {
    memberId: params.memberId,
    browserId: params.browserId,
    coordinates: params.coordinates,
    label: geocodedLocation.label,
    city: geocodedLocation.city,
    capturedAt,
  };

  const preciseLocations = current.preciseLocations.filter(
    (location) => location.browserId !== params.browserId,
  );
  preciseLocations.push(nextLocation);

  const centroidCoordinates = averageCoordinates(preciseLocations);
  const centroidGeocode = preciseLocations.length === 1
    ? geocodedLocation
    : await reverseGeocodeCoordinates(centroidCoordinates);

  const nextState: GroupLocationState = {
    centroid: {
      coordinates: centroidCoordinates,
      source: "precise",
      label:
        centroidGeocode.label ??
        formatFallbackLabel(centroidGeocode.city, "precise"),
      city: centroidGeocode.city,
      updatedAt: capturedAt,
    },
    preciseLocations,
  };

  const redis = getRedis();
  await redis.set(getGroupLocationKey(params.groupId), nextState);
  return nextState;
}
