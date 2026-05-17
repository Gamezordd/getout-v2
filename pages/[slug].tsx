import { useState, useEffect, useRef } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import GroupHeader from "@/components/group/GroupHeader";
import LocationBar from "@/components/group/LocationBar";
import LiveBar from "@/components/group/LiveBar";
import TabBar, { type Tab } from "@/components/group/TabBar";
import ShortlistPage from "@/components/group/shortlist/ShortlistPage";
import { toast } from "sonner";
import { CATEGORY_META, DEMO_PLACES } from "@/lib/demoPlaces";
import type { MemberPublic } from "@/lib/db/members";
import type { Category, GroupMember, GroupSession } from "@/types/group";

type Props = {
  groupId: string;
  category: Category;
  slug: string;
  initialMembers: MemberPublic[];
  isMember: boolean;
};

export default function GroupSlugPage({ groupId, category, slug, initialMembers, isMember: initialIsMember }: Props) {
  const router = useRouter();
  const meta = CATEGORY_META[category];
  const [members, setMembers] = useState<MemberPublic[]>(initialMembers);
  const [activeTab, setActiveTab] = useState<Tab>("shortlist");
  const [pinnedCount, setPinnedCount] = useState(0);
  const [headerHidden, setHeaderHidden] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.scrollHeight);
  }, []);

  // Auto-join when link is opened by a new user
  useEffect(() => {
    if (initialIsMember) return;
    fetch(`/api/groups/${groupId}/join`, { method: "POST" })
      .then((r) => r.json())
      .then((data: { members: MemberPublic[] }) => setMembers(data.members))
      .catch(() => {});
  }, [groupId, initialIsMember]);

  const groupMembers: GroupMember[] = members.map((m) => ({
    id: m.id,
    initial: m.label,
    color: m.isMe ? "#00e5a0" : m.color,
    textColor: m.isMe ? "#000" : undefined,
    name: m.isMe ? "You" : `Guest ${m.label}`,
  }));

  const session: GroupSession = {
    id: groupId,
    name: meta.groupName,
    location: "Your location",
    subtitle: `${members.length} member${members.length !== 1 ? "s" : ""}`,
    members: groupMembers,
    activeMembers: groupMembers,
    allPlaces: DEMO_PLACES[category],
    pinnedPlaces: [],
  };

  function handleShare() {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    toast("Link copied! Share it with your group.");
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-ink max-w-[430px] mx-auto">
      <div
        ref={headerRef}
        style={{ marginTop: headerHidden ? -headerHeight : 0, transition: "margin-top 0.28s ease", overflow: "hidden" }}
        className="flex-shrink-0"
      >
        <GroupHeader
          name={session.name}
          subtitle={session.subtitle}
          members={groupMembers}
          onBack={() => router.push("/")}
          onShare={handleShare}
        />
        <LocationBar location={session.location} onChange={() => toast("Location picker coming soon")} />
        <LiveBar activeMembers={groupMembers} decidingCount={groupMembers.length} pinnedCount={pinnedCount} />
      </div>

      <TabBar active={activeTab} shortlistCount={pinnedCount} onChange={setActiveTab} />

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "shortlist" && (
          <ShortlistPage session={session} onPinnedCountChange={setPinnedCount} onScroll={setHeaderHidden} />
        )}
        {activeTab === "explore" && (
          <div className="flex-1 flex items-center justify-center text-muted text-[13px]">
            Explore — coming soon
          </div>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, req }) => {
  const slug = params?.slug as string;

  // Lazy import to keep DB code server-only
  const { findGroupBySlug } = await import("@/lib/db/slugs");
  const { getGroup } = await import("@/lib/db/groups");
  const { getMembers, toPublicMember } = await import("@/lib/db/members");
  const { getBrowserIdFromCookie } = await import("@/lib/cookies");

  const groupId = await findGroupBySlug(slug);
  if (!groupId) return { notFound: true };

  const group = await getGroup(groupId);
  if (!group) return { notFound: true };

  const browserId = getBrowserIdFromCookie(req);
  const members = await getMembers(groupId);
  const isMember = browserId ? members.some((m) => m.browserId === browserId) : false;

  return {
    props: {
      groupId,
      category: group.category,
      slug,
      initialMembers: members.map((m) => toPublicMember(m, browserId ?? "")),
      isMember,
    },
  };
};
