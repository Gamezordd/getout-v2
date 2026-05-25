import type { Coordinates } from "./location";
import type { MemberTravel } from "./travel";

export type Category = "coffee" | "alcohol" | "food";

export type GroupMember = {
  id: string;
  initial: string;
  color: string;
  textColor?: string;
  name: string;
};

export type Place = {
  id: string;
  name: string;
  type: string;
  distance: string;
  rating: string;
  imageUrl: string;
  area?: string;
  coordinates?: Coordinates;
};

export type PinnedPlace = {
  place: Place;
  rank: number;
  votePercent: number;
  pinnedBy: GroupMember;
  memberTravel?: MemberTravel[];
};

export type GroupSession = {
  id: string;
  name: string;
  location: string;
  subtitle: string;
  members: GroupMember[];
  activeMembers: GroupMember[];
  allPlaces: Place[];
  pinnedPlaces: PinnedPlace[];
};
