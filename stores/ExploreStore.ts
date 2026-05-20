import { makeAutoObservable } from "mobx";
import type { MapPlace, PlacePhoto, PlaceImageStatus, PlaceImagesPayload } from "@/types/explore";

export class ExploreStore {
  places = new Map<string, MapPlace>();
  imagesByPlaceId = new Map<string, PlacePhoto[] | PlaceImageStatus>();
  selectedPlaceId: string | null = null;
  fetchedAreaKeys = new Set<string>();

  constructor() {
    makeAutoObservable(this);
  }

  addPlaces(places: MapPlace[]) {
    for (const place of places) {
      this.places.set(place.id, place);
    }
  }

  applyImagesPayload(payload: PlaceImagesPayload) {
    for (const [placeId, value] of Object.entries(payload)) {
      this.imagesByPlaceId.set(placeId, value);
    }
  }

  setImages(placeId: string, photos: PlacePhoto[]) {
    this.imagesByPlaceId.set(placeId, photos);
  }

  setSelectedPlace(placeId: string | null) {
    this.selectedPlaceId = placeId;
  }

  markAreaFetched(key: string) {
    this.fetchedAreaKeys.add(key);
  }

  hasAreaBeenFetched(key: string): boolean {
    return this.fetchedAreaKeys.has(key);
  }

  get selectedPlace(): MapPlace | null {
    if (!this.selectedPlaceId) return null;
    return this.places.get(this.selectedPlaceId) ?? null;
  }

  get loadingImageIds(): string[] {
    const ids: string[] = [];
    for (const [id, val] of this.imagesByPlaceId.entries()) {
      if (val === "loading") ids.push(id);
    }
    return ids;
  }
}
