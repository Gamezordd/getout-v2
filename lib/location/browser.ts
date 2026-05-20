import { Geolocation } from "@capacitor/geolocation";
import type { StoredPreciseLocation } from "@/types/location";

const STORAGE_KEY = "getout-v2-precise-location";
const GEOLOCATION_TIMEOUT_MS = 10000;

type PermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";

function canUseBrowser(): boolean {
  return typeof window !== "undefined";
}

function isNativePlatform(): boolean {
  if (!canUseBrowser()) return false;
  return "Capacitor" in window;
}

function parseStoredLocation(raw: string | null): StoredPreciseLocation | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredPreciseLocation;
    if (
      typeof parsed?.coordinates?.lat !== "number" ||
      typeof parsed?.coordinates?.lng !== "number" ||
      typeof parsed?.capturedAt !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredPreciseLocation(location: StoredPreciseLocation): void {
  if (!canUseBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}

async function getNativeLocation(
  promptIfNeeded: boolean,
): Promise<StoredPreciseLocation | null> {
  const permissions = await Geolocation.checkPermissions();
  const granted = [permissions.location, permissions.coarseLocation].includes(
    "granted" as PermissionState,
  );

  if (!granted) {
    if (!promptIfNeeded) return null;

    const requested = await Geolocation.requestPermissions();
    const requestGranted = [requested.location, requested.coarseLocation].includes(
      "granted" as PermissionState,
    );

    if (!requestGranted) return null;
  }

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: GEOLOCATION_TIMEOUT_MS,
  });

  return {
    coordinates: {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    },
    capturedAt: new Date().toISOString(),
  };
}

async function getWebLocation(
  promptIfNeeded: boolean,
): Promise<StoredPreciseLocation | null> {
  if (!("geolocation" in navigator)) return null;

  if (!promptIfNeeded && navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({
        name: "geolocation",
      } as PermissionDescriptor);
      if (status.state !== "granted") return null;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          capturedAt: new Date().toISOString(),
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,
      },
    );
  });
}

export function getStoredPreciseLocation(): StoredPreciseLocation | null {
  if (!canUseBrowser()) return null;
  return parseStoredLocation(window.localStorage.getItem(STORAGE_KEY));
}

export async function capturePreciseLocation(
  promptIfNeeded: boolean,
): Promise<StoredPreciseLocation | null> {
  if (!canUseBrowser()) return null;

  try {
    const location = isNativePlatform()
      ? await getNativeLocation(promptIfNeeded)
      : await getWebLocation(promptIfNeeded);

    if (!location) return null;
    saveStoredPreciseLocation(location);
    return location;
  } catch {
    return null;
  }
}
