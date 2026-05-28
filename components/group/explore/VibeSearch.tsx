import { useEffect, useRef, useState } from "react";
import { VibeCard, type VibeResult } from "./VibeCard";
import { getPusherClient } from "@/lib/pusher/client";
import { groupChannel, EVENTS } from "@/lib/pusher/events";
import type { GroupMember, Place } from "@/types/group";
import type { PlacePhoto, PlaceImagesPayload, VibeTag } from "@/types/explore";

type Props = {
  groupId: string;
  cityKey: string;
  category: string;
  members: GroupMember[];
  pinnedIds: Set<string>;
  onPin: (place: Place) => void;
  onScroll?: (hide: boolean) => void;
};

type ApiResponse = { data?: { results: VibeResult[] }; error?: string };

type PlaceImagesReadyPayload = {
  updates: Array<{ placeId: string; photos: PlacePhoto[] }>;
};


export default function VibeSearch({ groupId, cityKey, category, members, pinnedIds, onPin, onScroll }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VibeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // placeId → up to 6 photo URLs, accumulated across searches within a session
  const [imagesByPlaceId, setImagesByPlaceId] = useState<Map<string, string[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const lastScrollY = useRef(0);
  const [vibesByPlaceId, setVibesByPlaceId] = useState<Map<string, VibeTag[]>>(new Map());

  // Reset everything on category change
  useEffect(() => {
    setQuery("");
    setResults([]);
    setError(null);
    setLoading(false);
    setImagesByPlaceId(new Map());
    setVibesByPlaceId(new Map());
  }, [category]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: query, cityKey, category });
        const res = await fetch(`/api/groups/${groupId}/vibe-search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "Search failed");
        }
        const json = (await res.json()) as ApiResponse;
        const places = Array.isArray(json.data?.results) ? json.data.results : [];
        setResults(places);

        if (places.length > 0) {
          triggerImageFetch(places.map((p) => p.id));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, groupId, cityKey, category]);

  // Fetch vibe tags for current results (cache-first; enrichment via Pusher).
  useEffect(() => {
    if (results.length === 0) return;
    const places = results.map((r) => ({ id: r.id, name: r.name }));
    fetch(`/api/groups/${groupId}/place-vibes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ places }),
    })
      .then((res) => res.json())
      .then((payload: { data?: Record<string, VibeTag[] | "loading"> }) => {
        if (!payload.data) return;
        setVibesByPlaceId((prev) => {
          const next = new Map(prev);
          for (const [placeId, value] of Object.entries(payload.data!)) {
            if (Array.isArray(value)) next.set(placeId, value as VibeTag[]);
          }
          return next;
        });
      })
      .catch(() => undefined);
  }, [results, groupId]);

  // Trigger image generation queue and apply immediately-cached photos.
  async function triggerImageFetch(placeIds: string[]) {
    try {
      const res = await fetch(`/api/groups/${groupId}/place-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeIds }),
      });
      if (!res.ok) return;
      const payload = (await res.json().catch(() => null)) as { data?: PlaceImagesPayload } | null;
      if (!payload?.data) return;
      setImagesByPlaceId((prev) => {
        const next = new Map(prev);
        for (const [placeId, value] of Object.entries(payload.data!)) {
          if (Array.isArray(value) && value.length > 0) {
            next.set(placeId, (value as PlacePhoto[]).slice(0, 6).map((p) => p.url));
          }
        }
        return next;
      });
    } catch {
      // image enrichment is non-critical
    }
  }

  // Pusher: hydrate cards as images and vibe tags are generated asynchronously
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getPusherClient>["subscribe"]> | null = null;
    const imageHandler = (payload: PlaceImagesReadyPayload) => {
      setImagesByPlaceId((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const { placeId, photos } of payload.updates) {
          if (photos.length > 0 && !prev.has(placeId)) {
            next.set(placeId, photos.slice(0, 6).map((p) => p.url));
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };
    const vibeHandler = (payload: { updates: Array<{ placeId: string; tags: VibeTag[] }> }) => {
      setVibesByPlaceId((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const { placeId, tags } of payload.updates) {
          if (tags.length > 0 && !prev.has(placeId)) {
            next.set(placeId, tags);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };
    try {
      const pusher = getPusherClient();
      channel = pusher.subscribe(groupChannel(groupId));
      channel.bind(EVENTS.PLACE_IMAGES_READY, imageHandler);
      channel.bind(EVENTS.PLACE_VIBES_READY, vibeHandler);
    } catch {
      // Pusher not configured
    }
    return () => {
      if (channel) {
        channel.unbind(EVENTS.PLACE_IMAGES_READY, imageHandler);
        channel.unbind(EVENTS.PLACE_VIBES_READY, vibeHandler);
      }
    };
  }, [groupId]);

  const hasTyped = query.trim().length >= 2;

  return (
    <div
      className="flex flex-col gap-3 px-4 pt-[56px] pb-6 h-full overflow-y-auto"
      onScroll={(e) => {
        const next = e.currentTarget.scrollTop;
        onScroll?.(next > lastScrollY.current && next > 10);
        lastScrollY.current = next;
      }}
    >
      {/* Header */}
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
        Search by vibe
      </div>

      {/* Animated input */}
      <div className={`relative ${loading ? "vibe-searching" : ""}`}>
        <div className="vibe-border-aurora" />
        <div className="vibe-border-spark-1" />
        <div className="vibe-border-spark-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try cozy, dimly lit, live music..."
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-surface-2 border border-white/[0.07] rounded-[18px] px-4 py-[11px] text-[14px] text-ink placeholder:text-[#5a5a70] focus:outline-none relative z-10"
        />
      </div>


      {/* Error */}
      {error && <p className="text-[12px] text-rose-300 px-1">{error}</p>}

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="text-[10.5px] text-muted px-1">
            {results.length} place{results.length !== 1 ? "s" : ""} matched
          </div>
          <div className="space-y-3">
            {results.map((result, i) => (
              <VibeCard
                key={result.id}
                result={result}
                images={imagesByPlaceId.get(result.id) ?? (result.imageUrl ? [result.imageUrl] : [])}
                members={members}
                isPinned={pinnedIds.has(result.id)}
                animDelay={i * 55}
                onPin={onPin}
                vibeTags={vibesByPlaceId.get(result.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !error && hasTyped && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 pt-8 text-center">
          <div className="text-[24px] opacity-30">✦</div>
          <p className="text-[12.5px] text-muted">No places matched this vibe</p>
          <p className="text-[11px] text-muted/60">Try different keywords</p>
        </div>
      )}
    </div>
  );
}
