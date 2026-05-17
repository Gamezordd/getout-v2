import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import ShortlistSearch from "./ShortlistSearch";
import ShortlistRow from "./ShortlistRow";
import FinalizeBar from "./FinalizeBar";
import type { GroupSession, PinnedPlace, Place } from "@/types/group";

type Props = {
  session: GroupSession;
  onPinnedCountChange?: (count: number) => void;
  onScroll?: (hide: boolean) => void;
};

export default function ShortlistPage({ session, onPinnedCountChange, onScroll }: Props) {
  const [pinned, setPinned] = useState<PinnedPlace[]>(session.pinnedPlaces);
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const lastScrollY = useRef(0);

  const pinnedIds = new Set(pinned.map((p) => p.place.id));
  const leader = pinned.length > 0 ? pinned.reduce((top, item) => (item.votePercent >= top.votePercent ? item : top)) : null;

  useEffect(() => { onPinnedCountChange?.(pinned.length); }, [pinned.length]);

  function handlePin(place: Place) {
    if (pinnedIds.has(place.id)) { toast("Already on the shortlist"); return; }
    const pinnedBy = session.members.find((m) => m.id === "me") ?? session.members[0];
    setPinned((prev) => [...prev, { place, rank: prev.length + 1, votePercent: 0, pinnedBy }]);
    toast(`📌 ${place.name} added to shortlist!`);
  }

  function handleUnpin(placeId: string) {
    const item = pinned.find((p) => p.place.id === placeId);
    setPinned((prev) => prev.filter((p) => p.place.id !== placeId).map((p, i) => ({ ...p, rank: i + 1 })));
    setVotes((prev) => { const next = { ...prev }; delete next[placeId]; return next; });
    if (item) toast(`${item.place.name} removed`);
  }

  function handleVote(placeId: string) {
    const wasVoted = votes[placeId];
    setVotes((prev) => ({ ...prev, [placeId]: !wasVoted }));
    const item = pinned.find((p) => p.place.id === placeId);
    if (item) toast(wasVoted ? "Vote removed" : `Voted for ${item.place.name}!`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <ShortlistSearch places={session.allPlaces} pinnedIds={pinnedIds} onPin={handlePin} />

      {pinned.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="flex-1 overflow-y-auto px-[14px] pt-1 pb-[120px]"
          onScroll={(e) => {
            const y = e.currentTarget.scrollTop;
            onScroll?.(y > lastScrollY.current && y > 10);
            lastScrollY.current = y;
          }}
        >
          <div className="flex items-center justify-between px-[2px] py-2">
            <span className="text-[11px] font-bold text-muted uppercase tracking-[0.6px]">Pinned for a vote</span>
            <button onClick={() => { setPinned([]); setVotes({}); }} className="text-[11.5px] text-muted active:text-ink">
              Clear all
            </button>
          </div>
          {pinned.map((item) => (
            <ShortlistRow
              key={item.place.id}
              place={item.place}
              rank={item.rank}
              isLeader={item.place.id === leader?.place.id && item.votePercent > 0}
              isVoted={!!votes[item.place.id]}
              votePercent={item.votePercent}
              pinnedBy={item.pinnedBy}
              onVote={() => handleVote(item.place.id)}
              onUnpin={() => handleUnpin(item.place.id)}
              style={{ animationDelay: `${(item.rank - 1) * 0.07}s` }}
            />
          ))}
        </div>
      )}

      <FinalizeBar
        leader={leader?.votePercent && leader.votePercent > 0 ? leader : null}
        onFinalize={() => leader && toast(`Finalising ${leader.place.name} 🎉`)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-9">
      <div className="text-[38px] mb-[14px] opacity-55">📌</div>
      <div className="font-syne text-[17px] font-bold mb-[6px] text-ink">Shortlist is empty</div>
      <p className="text-[13px] text-muted leading-[1.55]">
        Search a place above, or head to <strong className="text-ink">Explore</strong> to discover by map or vibe — then pin it here for a group vote.
      </p>
    </div>
  );
}
