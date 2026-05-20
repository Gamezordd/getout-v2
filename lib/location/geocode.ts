import type { Coordinates } from "@/types/location";

export type ReverseGeocodeResult = {
  label: string | null;
  city: string | null;
};

type GeocodeResponse = {
  results?: Array<{
    formatted_address?: string;
    address_components?: Array<{
      long_name?: string;
      types?: string[];
    }>;
  }>;
};

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing");
  }
  return apiKey;
}

export async function reverseGeocodeCoordinates(
  coordinates: Coordinates,
): Promise<ReverseGeocodeResult> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    latlng: `${coordinates.lat},${coordinates.lng}`,
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
  );
  if (!response.ok) {
    return { label: null, city: null };
  }

  const payload = (await response.json()) as GeocodeResponse;
  const first = payload.results?.[0];
  const cityComponent = first?.address_components?.find((component) =>
    component.types?.includes("locality"),
  );

  return {
    label: first?.formatted_address ?? null,
    city: cityComponent?.long_name ?? null,
  };
}
