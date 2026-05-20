import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ShortlistSearch from "./ShortlistSearch";
import ShortlistRow from "./ShortlistRow";
import FinalizeBar from "./FinalizeBar";
import type { Category, GroupSession, PinnedPlace, Place } from "@/types/group";
import { getPusherClient } from "@/lib/pusher/client";
import { groupChannel, EVENTS } from "@/lib/pusher/events";

const SEARCH_RESULT_COUNT = 6;

type Props = {
  category: Category;
  session: GroupSession;
  onPinnedCountChange?: (count: number) => void;
  onPinnedIdsChange?: (ids: Set<string>) => void;
  onScroll?: (hide: boolean) => void;
};

export default function ShortlistPage({
  category,
  session,
  onPinnedCountChange,
  onPinnedIdsChange,
  onScroll,
}: Props) {
  const [pinned, setPinned] = useState<PinnedPlace[]>(session.pinnedPlaces);
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const lastScrollY = useRef(0);

  const pinnedIds = new Set(pinned.map((p) => p.place.id));
  const leader =
    pinned.length > 0
      ? pinned.reduce((top, item) => (item.votePercent >= top.votePercent ? item : top))
      : null;

  const fetchPins = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${session.id}/pins`);
      if (!res.ok) return;
      const payload = (await res.json()) as { data?: PinnedPlace[] };
      const fetched = payload.data ?? [];
      setPinned((current) => {
        const voteMap = new Map(current.map((p) => [p.place.id, p.votePercent]));
        return fetched.map((p) => ({ ...p, votePercent: voteMap.get(p.place.id) ?? 0 }));
      });
    } catch {
      // keep local state on failure
    }
  }, [session.id]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getPusherClient>["subscribe"]> | null = null;
    try {
      const pusher = getPusherClient();
      channel = pusher.subscribe(groupChannel(session.id));
      channel.bind(EVENTS.PINS_UPDATED, fetchPins);
    } catch {
      // Pusher not configured — live sync unavailable
    }
    return () => {
      if (channel) {
        channel.unbind(EVENTS.PINS_UPDATED, fetchPins);
        channel.unsubscribe();
      }
    };
  }, [session.id, fetchPins]);

  useEffect(() => {
    onPinnedCountChange?.(pinned.length);
    onPinnedIdsChange?.(new Set(pinned.map((p) => p.place.id)));
  }, [onPinnedCountChange, onPinnedIdsChange, pinned]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ count: String(SEARCH_RESULT_COUNT) });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(
          `/api/groups/${session.id}/places?${params.toString()}`,
          { signal: controller.signal },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          data?: Place[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Unable to search places");
        setPlaces(payload.data ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setPlaces([]);
        console.error("place search failed", error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [category, query, session.id]);

  async function handlePin(place: Place) {
    if (pinnedIds.has(place.id)) {
      toast("Already on the shortlist");
      return;
    }
    const pinnedBy = session.members.find((m) => m.name === "You") ?? session.members[0];
    try {
      await fetch(`/api/groups/${session.id}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place, pinnedBy }),
      });
      toast(`📌 ${place.name} added to shortlist!`);
    } catch {
      toast("Failed to pin place");
    }
  }

  async function handleUnpin(placeId: string) {
    const item = pinned.find((p) => p.place.id === placeId);
    try {
      await fetch(`/api/groups/${session.id}/pins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      setVotes((current) => {
        const next = { ...current };
        delete next[placeId];
        return next;
      });
      if (item) toast(`${item.place.name} removed`);
    } catch {
      toast("Failed to unpin place");
    }
  }

  async function handleClearAll() {
    try {
      await fetch(`/api/groups/${session.id}/pins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setVotes({});
    } catch {
      toast("Failed to clear shortlist");
    }
  }

  function handleVote(placeId: string) {
    const wasVoted = votes[placeId];
    setVotes((current) => ({ ...current, [placeId]: !wasVoted }));
    const item = pinned.find((p) => p.place.id === placeId);
    if (item) toast(wasVoted ? "Vote removed" : `Voted for ${item.place.name}`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <ShortlistSearch
        places={places}
        pinnedIds={pinnedIds}
        query={query}
        loading={loading}
        onQueryChange={setQuery}
        onPin={handlePin}
      />

      {pinned.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="flex-1 overflow-y-auto px-[14px] pt-1 pb-[120px]"
          onScroll={(event) => {
            const nextScrollY = event.currentTarget.scrollTop;
            onScroll?.(nextScrollY > lastScrollY.current && nextScrollY > 10);
            lastScrollY.current = nextScrollY;
          }}
        >
          <div className="flex items-center justify-between px-[2px] py-2">
            <span className="text-[11px] font-bold text-muted uppercase tracking-[0.6px]">
              Pinned for a vote
            </span>
            <button
              onClick={handleClearAll}
              className="text-[11.5px] text-muted active:text-ink"
            >
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
              members={session.members}
              memberTravel={item.memberTravel}
              onVote={() => handleVote(item.place.id)}
              onUnpin={() => handleUnpin(item.place.id)}
              style={{ animationDelay: `${(item.rank - 1) * 0.07}s` }}
            />
          ))}
        </div>
      )}

      <FinalizeBar
        leader={leader?.votePercent && leader.votePercent > 0 ? leader : null}
        onFinalize={() => leader && toast(`Finalizing ${leader.place.name} 🎉`)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-9">
      <div className="text-[38px] mb-[14px] opacity-55">📌</div>
      <div className="font-syne text-[17px] font-bold mb-[6px] text-ink">
        Shortlist is empty
      </div>
      <p className="text-[13px] text-muted leading-[1.55]">
        Search a place above, or head to <strong className="text-ink">Explore</strong> to
        discover by map or vibe, then pin it here for a group vote.
      </p>
    </div>
  );
}
