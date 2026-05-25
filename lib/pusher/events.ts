export const CHANNEL_PREFIX = "group-";

export function groupChannel(groupId: string): string {
  return `${CHANNEL_PREFIX}${groupId}`;
}

export const EVENTS = {
  PINS_UPDATED: "pins-updated",
  PLACE_IMAGES_READY: "place-images-ready",
  PLACE_VIBES_READY: "place-vibes-ready",
} as const;
