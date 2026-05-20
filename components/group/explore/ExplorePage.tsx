import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { observer } from "mobx-react-lite";
import { toast } from "sonner";
import PlaceDetail from "./PlaceDetail";

const ExploreMap = dynamic(() => import("./ExploreMap"), { ssr: false, loading: () => <div className="flex-1 bg-[#181e2c]" /> });
import { ExploreStore } from "@/stores/ExploreStore";
import { getPusherClient } from "@/lib/pusher/client";
import { groupChannel, EVENTS } from "@/lib/pusher/events";
import type { GroupSession, GroupMember } from "@/types/group";
import type { Coordinates } from "@/types/location";
import type { PlacePhoto } from "@/types/explore";

type Props = {
  session: GroupSession;
  centroid: Coordinates;
  pinnedIds: Set<string>;
  onPin: (placeId: string, pinnedBy: GroupMember) => void;
};

type PlaceImagesReadyPayload = {
  updates: Array<{ placeId: string; photos: PlacePhoto[] }>;
};

const ExplorePage = observer(function ExplorePage({ session, centroid, pinnedIds, onPin }: Props) {
  const store = useMemo(() => new ExploreStore(), []);
  const [mode, setMode] = useState<"map" | "vibe">("map");

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getPusherClient>["subscribe"]> | null = null;
    try {
      const pusher = getPusherClient();
      channel = pusher.subscribe(groupChannel(session.id));
      channel.bind(EVENTS.PLACE_IMAGES_READY, (payload: PlaceImagesReadyPayload) => {
        for (const { placeId, photos } of payload.updates) {
          store.setImages(placeId, photos);
        }
      });
    } catch {
      // Pusher not configured
    }
    return () => {
      if (channel) {
        channel.unbind(EVENTS.PLACE_IMAGES_READY);
        channel.unsubscribe();
      }
    };
  }, [session.id, store]);

  async function handlePin(placeId: string) {
    const place = store.places.get(placeId);
    if (!place) return;
    if (pinnedIds.has(placeId)) {
      toast("Already on the shortlist");
      return;
    }
    const me = session.members.find((m) => m.name === "You") ?? session.members[0];
    try {
      await fetch(`/api/groups/${session.id}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place, pinnedBy: me }),
      });
      onPin(placeId, me);
      toast(`📌 ${place.name} added to shortlist!`);
    } catch {
      toast("Failed to pin place");
    }
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Toggle — floated over the content */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex bg-surface-2 rounded-[10px] p-[3px] gap-[2px]"
        style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      >
        {(["map", "vibe"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMode(tab)}
            className="flex items-center gap-[5px] px-[14px] py-[6px] rounded-[8px] text-[12.5px] font-semibold transition-all"
            style={mode === tab
              ? { background: "#22222a", color: "#f0f0f5", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }
              : { color: "#5a5a70" }}
          >
            {tab === "map" ? (
              <><svg width="13" height="13" fill="none" viewBox="0 0 14 14"><path d="M1 3l4 2 4-2 4 2v8l-4-2-4 2-4-2V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>Map</>
            ) : (
              <><svg width="13" height="13" fill="none" viewBox="0 0 14 14"><path d="M7 1l1.3 4h4.2l-3.4 2.5 1.3 4L7 9.1 3.6 11.5l1.3-4L1.5 5H5.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>Vibe</>
            )}
          </button>
        ))}
      </div>

      {mode === "map" && (
        <div className="absolute inset-0 flex flex-col">
          <ExploreMap
            store={store}
            groupId={session.id}
            centroid={centroid}
            pinnedIds={pinnedIds}
          />
          <PlaceDetail
            store={store}
            session={session}
            pinnedIds={pinnedIds}
            onPin={handlePin}
            onClose={() => store.setSelectedPlace(null)}
          />
        </div>
      )}

      {mode === "vibe" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted text-[13px] px-9 text-center">
          <div className="text-[32px] mb-3 opacity-50">✦</div>
          <p>Vibe search coming soon</p>
        </div>
      )}
    </div>
  );
});

export default ExplorePage;
