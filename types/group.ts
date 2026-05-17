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
};

export type PinnedPlace = {
  place: Place;
  rank: number;
  votePercent: number;
  pinnedBy: GroupMember;
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
