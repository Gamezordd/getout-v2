export type Coordinates = {
  lat: number;
  lng: number;
};

export type LocationSource = "ip" | "precise";

export type StoredPreciseLocation = {
  coordinates: Coordinates;
  capturedAt: string;
};

export type GroupPreciseLocationEntry = {
  memberId: string;
  browserId: string;
  coordinates: Coordinates;
  label: string | null;
  city: string | null;
  capturedAt: string;
};

export type GroupCentroid = {
  coordinates: Coordinates;
  source: LocationSource;
  label: string | null;
  city: string | null;
  updatedAt: string;
};

export type GroupLocationState = {
  centroid: GroupCentroid | null;
  preciseLocations: GroupPreciseLocationEntry[];
};
