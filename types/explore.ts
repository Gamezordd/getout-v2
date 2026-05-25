import type { Place } from "./group";
import type { Coordinates } from "./location";

export type MapPlace = Place & {
  coordinates: Coordinates;
  priceLevel?: number; // 1–4 maps to $–$$$$
  openNow?: boolean;
  reviewCount?: number;
  description?: string;
};

export type PlacePhoto = { url: string; credit: string | null };
export type PlaceImageStatus = "loading" | "error";
export type PlaceImagesPayload = Record<string, PlacePhoto[] | PlaceImageStatus>;

export type VibeTag = { emoji: string; label: string };
export type PlaceVibesPayload = Record<string, VibeTag[] | "loading">;
