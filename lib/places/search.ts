import type { Category, Place } from "@/types/group";
import type { MapPlace } from "@/types/explore";
import type { Coordinates } from "@/types/location";
import { isPlaceNameAllowed } from "./filters";

const CATEGORY_TYPES: Record<Category, string> = {
  coffee: "cafe",
  alcohol: "bar",
  food: "restaurant",
};

const CATEGORY_QUERIES: Record<Category, string> = {
  coffee: "coffee",
  alcohol: "bars",
  food: "restaurants",
};

const DEFAULT_IMAGE_URL =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=240&q=70";
const SEARCH_BIAS_RADIUS_METERS = 50000;

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

type NearbySearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    primaryTypeDisplayName?: { text?: string };
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    regularOpeningHours?: { openNow?: boolean };
    editorialSummary?: { text?: string };
    photos?: Array<{ name?: string }>;
  }>;
};
type NearbyPlaceResult = NonNullable<NearbySearchResponse["places"]>[number];

type PlacesSearchResponse = {
  nextPageToken?: string;
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    primaryTypeDisplayName?: { text?: string };
    rating?: number;
    photos?: Array<{ name?: string }>;
  }>;
};
type TextPlaceResult = NonNullable<PlacesSearchResponse["places"]>[number];

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing");
  }
  return apiKey;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getDistanceInMeters(from: Coordinates, to: Coordinates): number {
  const earthRadius = 6371000;
  const latDiff = toRadians(to.lat - from.lat);
  const lngDiff = toRadians(to.lng - from.lng);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(lngDiff / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceInMeters: number): string {
  if (distanceInMeters < 1000) {
    return `${Math.max(1, Math.round(distanceInMeters / 100) * 100)} m`;
  }
  return `${(distanceInMeters / 1000).toFixed(1)} km`;
}

async function resolvePhotoUrl(photoName?: string): Promise<string> {
  if (!photoName) return DEFAULT_IMAGE_URL;

  const apiKey = getApiKey();
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=240&skipHttpRedirect=true&key=${encodeURIComponent(apiKey)}`,
  );
  if (!response.ok) return DEFAULT_IMAGE_URL;

  const payload = (await response.json().catch(() => null)) as
    | { photoUri?: string }
    | null;
  return payload?.photoUri ?? DEFAULT_IMAGE_URL;
}

async function fetchTextSearchPage(params: {
  apiKey: string;
  category: Category;
  centroid: Coordinates;
  query: string;
  count: number;
  pageToken?: string;
}): Promise<PlacesSearchResponse> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": params.apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName,places.rating,places.photos",
    },
    body: JSON.stringify({
      textQuery: params.query,
      includedType: CATEGORY_TYPES[params.category],
      strictTypeFiltering: true,
      rankPreference: "DISTANCE",
      pageSize: Math.min(params.count, 20),
      locationBias: {
        circle: {
          center: {
            latitude: params.centroid.lat,
            longitude: params.centroid.lng,
          },
          radius: SEARCH_BIAS_RADIUS_METERS,
        },
      },
      ...(params.pageToken ? { pageToken: params.pageToken } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to search places");
  }

  return (await response.json()) as PlacesSearchResponse;
}

async function fetchNearbySearchPage(params: {
  apiKey: string;
  category: Category;
  center: Coordinates;
  radiusMeters: number;
  count: number;
}): Promise<NearbySearchResponse> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": params.apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.location,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.editorialSummary,places.photos",
    },
    body: JSON.stringify({
      includedTypes: [CATEGORY_TYPES[params.category]],
      maxResultCount: Math.min(params.count, 20),
      locationRestriction: {
        circle: {
          center: {
            latitude: params.center.lat,
            longitude: params.center.lng,
          },
          radius: params.radiusMeters,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to search nearby places");
  }

  return (await response.json()) as NearbySearchResponse;
}

export async function searchPlaces(params: {
  category: Category;
  centroid: Coordinates;
  query: string;
  count?: number;
}): Promise<Place[]> {
  const apiKey = getApiKey();
  const searchQuery = params.query.trim() || CATEGORY_QUERIES[params.category];
  const count = params.count ?? 6;
  const collectedPlaces = new Map<string, TextPlaceResult>();
  let nextPageToken: string | undefined;

  do {
    const payload = await fetchTextSearchPage({
      apiKey,
      category: params.category,
      centroid: params.centroid,
      query: searchQuery,
      count,
      pageToken: nextPageToken,
    });

    for (const place of payload.places ?? []) {
      const name = place.displayName?.text ?? "";
      const placeId = place.id;
      if (!placeId || !isPlaceNameAllowed(params.category, name)) continue;
      if (!collectedPlaces.has(placeId)) {
        collectedPlaces.set(placeId, place);
      }
      if (collectedPlaces.size >= count) break;
    }

    nextPageToken = payload.nextPageToken;
  } while (collectedPlaces.size < count && nextPageToken);

  return Promise.all(
    Array.from(collectedPlaces.values()).slice(0, count).map(async (place, index) => {
      const latitude = place.location?.latitude ?? params.centroid.lat;
      const longitude = place.location?.longitude ?? params.centroid.lng;
      const distance = getDistanceInMeters(params.centroid, {
        lat: latitude,
        lng: longitude,
      });

      return {
        id: place.id ?? `${params.category}-${index}`,
        name: place.displayName?.text ?? "Unknown place",
        type:
          place.primaryTypeDisplayName?.text ??
          place.formattedAddress ??
          "Nearby place",
        distance: formatDistance(distance),
        rating:
          typeof place.rating === "number" ? place.rating.toFixed(1) : "New",
        imageUrl: await resolvePhotoUrl(place.photos?.[0]?.name),
        coordinates: { lat: latitude, lng: longitude },
      };
    }),
  );
}

const MAP_MIN_RATING = 3.8;
const MAP_MIN_REVIEW_COUNT = 1800;

export async function searchMapPlaces(params: {
  category: Category;
  center: Coordinates;
  radiusMeters: number;
  count?: number;
}): Promise<MapPlace[]> {
  const apiKey = getApiKey();
  const count = params.count ?? 20;
  const collectedPlaces = new Map<string, NearbyPlaceResult>();
  const payload = await fetchNearbySearchPage({
    apiKey,
    category: params.category,
    center: params.center,
    radiusMeters: params.radiusMeters,
    count,
  });

  for (const place of payload.places ?? []) {
    const name = place.displayName?.text ?? "";
    const placeId = place.id;
    if (!placeId || !isPlaceNameAllowed(params.category, name)) continue;
    if (typeof place.rating !== "number") continue;
    if (place.rating < MAP_MIN_RATING) continue;
    if (typeof place.userRatingCount === "number" && place.userRatingCount < MAP_MIN_REVIEW_COUNT) continue;
    if (!collectedPlaces.has(placeId)) {
      collectedPlaces.set(placeId, place);
    }
    if (collectedPlaces.size >= count) break;
  }

  return Promise.all(
    Array.from(collectedPlaces.values()).slice(0, count).map(async (place, index) => {
      const lat = place.location?.latitude ?? params.center.lat;
      const lng = place.location?.longitude ?? params.center.lng;
      const distance = getDistanceInMeters(params.center, { lat, lng });
      return {
        id: place.id ?? `map-${params.category}-${index}`,
        name: place.displayName?.text ?? "Unknown place",
        type: place.primaryTypeDisplayName?.text ?? "Nearby place",
        distance: formatDistance(distance),
        rating: typeof place.rating === "number" ? place.rating.toFixed(1) : "New",
        reviewCount: place.userRatingCount,
        priceLevel: place.priceLevel ? PRICE_LEVEL_MAP[place.priceLevel] : undefined,
        openNow: place.regularOpeningHours?.openNow,
        description: place.editorialSummary?.text,
        imageUrl: await resolvePhotoUrl(place.photos?.[0]?.name),
        coordinates: { lat, lng },
      } satisfies MapPlace;
    }),
  );
}
