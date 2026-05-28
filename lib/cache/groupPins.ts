import { getRedis } from "./client";
import type { GroupMember, Place } from "@/types/group";

type PinnedEntry = {
  place: Place;
  pinnedBy: GroupMember;
  pinnedAt: string;
  note?: string;
};

const GROUP_PINS_PREFIX = "group-pins:";

function getPinsKey(groupId: string): string {
  return `${GROUP_PINS_PREFIX}${groupId}`;
}

export async function getGroupPins(groupId: string): Promise<PinnedEntry[]> {
  const redis = getRedis();
  const pins = await redis.get<PinnedEntry[]>(getPinsKey(groupId));
  return pins ?? [];
}

export async function addGroupPin(
  groupId: string,
  place: Place,
  pinnedBy: GroupMember,
): Promise<PinnedEntry[]> {
  const current = await getGroupPins(groupId);
  if (current.some((p) => p.place.id === place.id)) return current;

  const next: PinnedEntry[] = [
    ...current,
    { place, pinnedBy, pinnedAt: new Date().toISOString() },
  ];
  const redis = getRedis();
  await redis.set(getPinsKey(groupId), next);
  return next;
}

export async function removeGroupPin(
  groupId: string,
  placeId: string,
): Promise<PinnedEntry[]> {
  const current = await getGroupPins(groupId);
  const next = current.filter((p) => p.place.id !== placeId);
  const redis = getRedis();
  await redis.set(getPinsKey(groupId), next);
  return next;
}

export async function clearGroupPins(groupId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(getPinsKey(groupId));
}

export async function updateGroupPinNote(
  groupId: string,
  placeId: string,
  note: string,
): Promise<PinnedEntry[]> {
  const current = await getGroupPins(groupId);
  const next = current.map((p) =>
    p.place.id === placeId ? { ...p, note: note || undefined } : p
  );
  const redis = getRedis();
  await redis.set(getPinsKey(groupId), next);
  return next;
}
