import { useRef, useState, useEffect } from "react";
import type { GetStaticPaths, GetStaticProps } from "next";
import GroupHeader from "@/components/group/GroupHeader";
import LocationBar from "@/components/group/LocationBar";
import LiveBar from "@/components/group/LiveBar";
import TabBar, { type Tab } from "@/components/group/TabBar";
import ShortlistPage from "@/components/group/shortlist/ShortlistPage";
import { toast } from "sonner";
import type { GroupSession } from "@/types/group";

type Props = { session: GroupSession };

export default function GroupPage({ session }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("shortlist");
  const [pinnedCount, setPinnedCount] = useState(session.pinnedPlaces.length);
  const [headerHidden, setHeaderHidden] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.scrollHeight);
  }, []);

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
          members={session.members}
          onBack={() => {}}
          onShare={() => toast("Invite link copied!")}
        />
        <LocationBar location={session.location} onChange={() => toast("Location picker coming soon")} />
        <LiveBar
          activeMembers={session.activeMembers}
          decidingCount={session.activeMembers.length}
          pinnedCount={pinnedCount}
        />
      </div>

      <TabBar active={activeTab} shortlistCount={pinnedCount} onChange={setActiveTab} />

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "shortlist" && (
          <ShortlistPage
            session={session}
            onPinnedCountChange={setPinnedCount}
            onScroll={(hide) => setHeaderHidden(hide)}
          />
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

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [{ params: { id: "demo" } }],
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: {
    session: {
      id: "demo",
      name: "Bars tonight 🥂",
      location: "Mahatma Gandhi Rd, Bengaluru",
      subtitle: "Bengaluru · 24 venues",
      members: [
        { id: "ravi",  initial: "R", color: "#7c5cbf", name: "Ravi" },
        { id: "priya", initial: "P", color: "#e05c8a", name: "Priya" },
        { id: "me",    initial: "A", color: "#00e5a0", textColor: "#000", name: "You" },
        { id: "m4",    initial: "K", color: "#e07f2b", name: "Kiran" },
        { id: "m5",    initial: "S", color: "#4caf8a", name: "Sanya" },
      ],
      activeMembers: [
        { id: "ravi",  initial: "R", color: "#7c5cbf", name: "Ravi" },
        { id: "priya", initial: "P", color: "#e05c8a", name: "Priya" },
        { id: "me",    initial: "A", color: "#00e5a0", textColor: "#000", name: "You" },
      ],
      allPlaces: [
        { id: "church",     name: "Church Street Social", type: "Bar · Church St",         distance: "7 min",  rating: "★ 4.2", imageUrl: "https://images.unsplash.com/photo-1574096079513-d8259312b785?w=120&q=70" },
        { id: "kaze",       name: "Kazé Bar & Kitchen",   type: "Bar · Ashok Nagar",        distance: "5 min",  rating: "★ 4.4", imageUrl: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=120&q=70" },
        { id: "thirteenth", name: "The 13th Floor",        type: "Rooftop · MG Road",        distance: "9 min",  rating: "★ 4.4", imageUrl: "https://images.unsplash.com/photo-1587899897387-091ebd01a6b2?w=120&q=70" },
        { id: "skyye",      name: "Skyye Lounge",          type: "Lounge · UB City",         distance: "14 min", rating: "★ 4.6", imageUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=120&q=70" },
        { id: "bobs",       name: "Bob's Bar",             type: "Pub · Wood Street",        distance: "14 min", rating: "★ 4.1", imageUrl: "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=120&q=70" },
        { id: "pangeo",     name: "Pangeo",                type: "Rooftop · Brigade Rd",     distance: "3 min",  rating: "★ 4.5", imageUrl: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=120&q=70" },
        { id: "communiti",  name: "Communiti",             type: "Gastropub · Ashok Nagar",  distance: "5 min",  rating: "★ 4.4", imageUrl: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=120&q=70" },
      ],
      pinnedPlaces: [
        {
          place: { id: "communiti", name: "Communiti", type: "Gastropub · Ashok Nagar", distance: "5 min", rating: "★ 4.4", imageUrl: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=120&q=70" },
          rank: 1, votePercent: 66,
          pinnedBy: { id: "me", initial: "A", color: "#00e5a0", textColor: "#000", name: "You" },
        },
        {
          place: { id: "pangeo", name: "Pangeo", type: "Rooftop · Brigade Rd", distance: "3 min", rating: "★ 4.5", imageUrl: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=120&q=70" },
          rank: 2, votePercent: 0,
          pinnedBy: { id: "ravi", initial: "R", color: "#7c5cbf", name: "Ravi" },
        },
      ],
    },
  },
});
