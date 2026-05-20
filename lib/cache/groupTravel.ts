import { getRedis } from "./client";
import type { TravelEntry } from "@/types/travel";

export type GroupTravelCache = Record<string, Record<string, TravelEntry>>;

const GROUP_TRAVEL_PREFIX = "group-travel:v1:";
const GROUP_TRAVEL_TTL = 60 * 60 * 6; // 6 hours

function getKey(groupId: string): string {
  return `${GROUP_TRAVEL_PREFIX}${groupId}`;
}

export async function getGroupTravelCache(groupId: string): Promise<GroupTravelCache> {
  const redis = getRedis();
  return (await redis.get<GroupTravelCache>(getKey(groupId))) ?? {};
}

export async function setGroupTravelCache(
  groupId: string,
  cache: GroupTravelCache,
): Promise<void> {
  const redis = getRedis();
  await redis.set(getKey(groupId), cache, { ex: GROUP_TRAVEL_TTL });
}
