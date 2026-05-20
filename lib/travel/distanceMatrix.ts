import type { Coordinates } from "@/types/location";
import type { TravelEntry } from "@/types/travel";

type GoogleDistanceMatrixResponse = {
  status: string;
  rows: Array<{
    elements: Array<{
      status: string;
      duration?: { value: number };
      distance?: { value: number };
    }>;
  }>;
};

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is missing");
  return key;
}

/**
 * Returns a matrix[originIdx][destIdx] of TravelEntry (or null on no route).
 * Uses Google Distance Matrix API with driving mode.
 */
export async function fetchDistanceMatrix(
  origins: Coordinates[],
  destinations: Coordinates[],
): Promise<(TravelEntry | null)[][]> {
  if (origins.length === 0 || destinations.length === 0) return [];

  const originsStr = origins.map((c) => `${c.lat},${c.lng}`).join("|");
  const destsStr = destinations.map((c) => `${c.lat},${c.lng}`).join("|");

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", originsStr);
  url.searchParams.set("destinations", destsStr);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", getApiKey());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Distance Matrix API ${res.status}`);

  const data = (await res.json()) as GoogleDistanceMatrixResponse;
  if (data.status !== "OK") throw new Error(`Distance Matrix error: ${data.status}`);

  return data.rows.map((row) =>
    row.elements.map((el) => {
      if (el.status !== "OK" || !el.duration || !el.distance) return null;
      return { durationSeconds: el.duration.value, distanceMeters: el.distance.value };
    }),
  );
}
