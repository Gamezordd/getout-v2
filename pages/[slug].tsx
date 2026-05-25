import { useEffect, useRef, useState } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import GroupHeader from "@/components/group/GroupHeader";
import LocationBar from "@/components/group/LocationBar";
import LiveBar from "@/components/group/LiveBar";
import TabBar, { type Tab } from "@/components/group/TabBar";
import ShortlistPage from "@/components/group/shortlist/ShortlistPage";
import ExplorePage from "@/components/group/explore/ExplorePage";
import { toast } from "sonner";
import { CATEGORY_META } from "@/lib/demoPlaces";
import { capturePreciseLocation, getStoredPreciseLocation } from "@/lib/location/browser";
import type { MemberPublic } from "@/lib/db/members";
import type { Category, GroupMember, GroupSession } from "@/types/group";
import type { Coordinates, GroupLocationState } from "@/types/location";

type Props = {
  groupId: string;
  category: Category;
  slug: string;
  initialLocationState: GroupLocationState;
  initialMembers: MemberPublic[];
  isMember: boolean;
};

function getLocationLabel(locationState: GroupLocationState): string {
  return locationState.centroid?.label ?? "Set a precise group location";
}

export default function GroupSlugPage({
  groupId,
  category,
  slug,
  initialLocationState,
  initialMembers,
  isMember: initialIsMember,
}: Props) {
  const router = useRouter();
  const meta = CATEGORY_META[category];
  const [members, setMembers] = useState<MemberPublic[]>(initialMembers);
  const [locationState, setLocationState] =
    useState<GroupLocationState>(initialLocationState);
  const [activeTab, setActiveTab] = useState<Tab>("shortlist");
  const [pinnedCount, setPinnedCount] = useState(0);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [headerHidden, setHeaderHidden] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.scrollHeight);
    }
  }, []);

  useEffect(() => {
    if (initialIsMember) return;

    fetch(`/api/groups/${groupId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preciseLocation: getStoredPreciseLocation(),
      }),
    })
      .then((response) => response.json())
      .then((payload: { data?: { members: MemberPublic[]; locationState: GroupLocationState | null } }) => {
        if (!payload.data) return;
        setMembers(payload.data.members);
        if (payload.data.locationState) {
          setLocationState(payload.data.locationState);
        }
      })
      .catch(() => undefined);
  }, [groupId, initialIsMember]);

  async function handlePreciseLocationUpdate() {
    if (updatingLocation) return;

    setUpdatingLocation(true);
    try {
      const preciseLocation = await capturePreciseLocation(true);
      if (!preciseLocation) {
        toast("Precise location was not available");
        return;
      }

      const response = await fetch(`/api/groups/${groupId}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: preciseLocation.coordinates }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: GroupLocationState;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "Unable to update location");
      }

      setLocationState(payload.data);
      toast("Precise location saved for this group");
    } catch (error) {
      console.error("location update failed", error);
      toast("Unable to update precise location");
    } finally {
      setUpdatingLocation(false);
    }
  }

  const groupMembers: GroupMember[] = members.map((member) => ({
    id: member.id,
    initial: member.label,
    color: member.isMe ? "#00e5a0" : member.color,
    textColor: member.isMe ? "#000" : undefined,
    name: member.isMe ? "You" : `Guest ${member.label}`,
  }));

  const session: GroupSession = {
    id: groupId,
    name: meta.groupName,
    location: getLocationLabel(locationState),
    subtitle: `${members.length} member${members.length !== 1 ? "s" : ""}`,
    members: groupMembers,
    activeMembers: groupMembers,
    allPlaces: [],
    pinnedPlaces: [],
  };

  function handleShare() {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard?.writeText(url).catch(() => undefined);
    toast("Link copied! Share it with your group.");
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-ink max-w-[430px] mx-auto">
      <div
        ref={headerRef}
        className="flex-shrink-0 overflow-hidden transition-[margin] duration-300 ease-out"
        style={{ marginTop: headerHidden ? -headerHeight : 0 }}
      >
        <GroupHeader
          name={session.name}
          subtitle={session.subtitle}
          members={groupMembers}
          onBack={() => router.push("/")}
          onShare={handleShare}
        />
        <LocationBar
          location={session.location}
          actionLabel={updatingLocation ? "Updating" : "Use precise"}
          onChange={handlePreciseLocationUpdate}
        />
        <LiveBar
          activeMembers={groupMembers}
          decidingCount={groupMembers.length}
          pinnedCount={pinnedCount}
        />
      </div>

      <TabBar
        active={activeTab}
        shortlistCount={pinnedCount}
        onChange={(tab) => { setActiveTab(tab); setHeaderHidden(false); }}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className={`flex-1 overflow-hidden flex flex-col ${activeTab !== "shortlist" ? "hidden" : ""}`}>
          <ShortlistPage
            category={category}
            session={session}
            onPinnedCountChange={setPinnedCount}
            onPinnedIdsChange={setPinnedIds}
            onScroll={setHeaderHidden}
          />
        </div>
        <div className={`flex-1 overflow-hidden flex flex-col ${activeTab !== "explore" ? "hidden" : ""}`}>
          <ExplorePage
            session={session}
            centroid={locationState.centroid?.coordinates ?? { lat: 12.9716, lng: 77.5946 }}
            category={category}
            cityKey={locationState.centroid?.city ?? ""}
            pinnedIds={pinnedIds}
            onPin={(placeId: string, _pinnedBy: GroupMember) => {
              setPinnedIds((prev) => new Set([...prev, placeId]));
            }}
            onScroll={setHeaderHidden}
          />
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({
  params,
  req,
}) => {
  const slug = params?.slug as string;

  const { findGroupBySlug } = await import("@/lib/db/slugs");
  const { getGroup } = await import("@/lib/db/groups");
  const { getMembers, toPublicMember } = await import("@/lib/db/members");
  const { getBrowserIdFromCookie } = await import("@/lib/cookies");
  const { getGroupLocationState } = await import("@/lib/cache/groupLocations");

  const groupId = await findGroupBySlug(slug);
  if (!groupId) return { notFound: true };

  const group = await getGroup(groupId);
  if (!group) return { notFound: true };

  const browserId = getBrowserIdFromCookie(req);
  const [members, initialLocationState] = await Promise.all([
    getMembers(groupId),
    getGroupLocationState(groupId),
  ]);
  const isMember = browserId
    ? members.some((member) => member.browserId === browserId)
    : false;

  return {
    props: {
      groupId,
      category: group.category,
      slug,
      initialLocationState,
      initialMembers: members.map((member) =>
        toPublicMember(member, browserId ?? ""),
      ),
      isMember,
    },
  };
};
