import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import type { ExploreStore } from "@/stores/ExploreStore";
import type { GroupSession } from "@/types/group";
import type { PlaceImagesPayload } from "@/types/explore";

type Props = {
  store: ExploreStore;
  session: GroupSession;
  pinnedIds: Set<string>;
  onPin: (placeId: string) => void;
  onClose: () => void;
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

const PlaceDetail = observer(function PlaceDetail({
  store,
  session,
  pinnedIds,
  onPin,
  onClose,
}: Props) {
  const place = store.selectedPlace;
  const [photoIndex, setPhotoIndex] = useState(0);
  const show = place !== null;

  useEffect(() => {
    setPhotoIndex(0);
  }, [place?.id]);

  useEffect(() => {
    if (!place) return;
    const placeId = place.id;
    if (Array.isArray(store.imagesByPlaceId.get(placeId))) return;

    let cancelled = false;
    let retryTimer: number | null = null;

    async function loadImages() {
      if (cancelled) return;
      try {
        const response = await fetch(`/api/groups/${session.id}/place-images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeIds: [placeId] }),
        });
        if (cancelled) return;

        const payload = (await response.json()) as {
          data?: PlaceImagesPayload;
        };
        if (!payload.data || cancelled) return;

        store.applyImagesPayload(payload.data);
        if (payload.data[placeId] === "loading") {
          retryTimer = window.setTimeout(loadImages, 3000);
        }
      } catch {}
    }

    loadImages();

    return () => {
      cancelled = true;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [place, session.id, store]);

  const rawImages = place ? store.imagesByPlaceId.get(place.id) : undefined;
  const photos = Array.isArray(rawImages) ? rawImages : [];
  const imagesLoading = rawImages === "loading";
  const currentCredit = photos[photoIndex]?.credit ?? null;
  const isPinned = place ? pinnedIds.has(place.id) : false;

  function slide(direction: number) {
    setPhotoIndex((index) => (index + direction + photos.length) % Math.max(1, photos.length));
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-[10px] pb-[14px] pointer-events-none"
      style={{
        transform: show ? "translateY(0)" : "translateY(110%)",
        transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
        pointerEvents: show ? "all" : "none",
      }}
    >
      <div className="bg-surface border border-[rgba(255,255,255,.13)] rounded-[20px] overflow-hidden shadow-[0_-4px_32px_rgba(0,0,0,.5)]">
        <div className="w-8 h-[3px] rounded-[2px] bg-surface-3 mx-auto mt-[10px]" />

        <div className="h-[160px] relative overflow-hidden mt-[10px]">
          {imagesLoading && (
            <div className="absolute inset-0 bg-surface-2 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-muted border-t-accent rounded-full animate-spin" />
            </div>
          )}
          {!imagesLoading && photos.length === 0 && place && (
            <img src={place.imageUrl} className="w-full h-full object-cover brightness-[.78]" alt={place.name} />
          )}
          {photos.length > 0 && (
            <>
              <div
                className="flex h-full"
                style={{
                  transform: `translateX(-${photoIndex * 100}%)`,
                  transition: "transform .3s cubic-bezier(.16,1,.3,1)",
                }}
              >
                {photos.map((photo, index) => (
                  <div key={index} className="flex-shrink-0 w-full h-full">
                    <img src={photo.url} className="w-full h-full object-cover brightness-[.78]" alt="" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(10,10,13,.85)] pointer-events-none" />
              {photos.length > 1 && (
                <>
                  <button onClick={() => slide(-1)} className="absolute left-[9px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 text-[11px]">
                    ‹
                  </button>
                  <button onClick={() => slide(1)} className="absolute right-[9px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 text-[11px]">
                    ›
                  </button>
                  <div className="absolute bottom-[9px] left-1/2 -translate-x-1/2 flex gap-1">
                    {photos.map((_, index) => (
                      <div key={index} className="h-[5px] rounded-full transition-all duration-200" style={{ width: index === photoIndex ? 14 : 5, background: index === photoIndex ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.35)" }} />
                    ))}
                  </div>
                </>
              )}
              <div className="absolute top-[9px] left-[9px] bg-black/50 backdrop-blur-md border border-white/10 px-2 py-[3px] rounded-full flex items-center gap-1">
                <span className="text-[10px] font-semibold text-white/75">{photos.length} photos</span>
              </div>
              {currentCredit && (
                <div className="absolute bottom-[9px] left-[9px] pointer-events-none">
                  <span className="text-[9px] text-white/40">© {currentCredit}</span>
                </div>
              )}
            </>
          )}
          <button onClick={onClose} className="absolute top-[9px] right-[9px] w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/75">
            <svg width="11" height="11" fill="none" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {place && (
          <>
            <div className="px-[14px] pt-[12px]">
              {/* Name + price badge */}
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-syne text-[17px] font-extrabold tracking-tight leading-tight">
                    {place.name}
                  </div>
                  <div className="text-[12px] text-muted mt-[3px]">{place.type}</div>
                </div>
                <div className="flex flex-col items-end gap-[5px] flex-shrink-0">
                  {place.priceLevel !== undefined && place.priceLevel > 0 && (
                    <div className="px-[9px] py-[4px] rounded-[10px] bg-white/[0.04] border border-white/[0.08]">
                      <span className="text-[12px] font-bold text-ink">{"$".repeat(place.priceLevel)}</span>
                    </div>
                  )}
                  {place.openNow !== undefined && (
                    <div className={`px-[9px] py-[4px] rounded-[10px] text-[11px] font-semibold ${
                      place.openNow
                        ? "bg-accent/10 border border-accent/25 text-accent"
                        : "bg-white/[0.04] border border-white/[0.08] text-muted"
                    }`}>
                      {place.openNow ? "Open now" : "Closed"}
                    </div>
                  )}
                </div>
              </div>

              {/* Editorial description */}
              {place.description && (
                <p className="mt-[8px] text-[12px] text-muted leading-[1.55] line-clamp-2">
                  {place.description}
                </p>
              )}

              {/* Meta row: rating · reviews · distance */}
              <div className="mt-[10px] flex items-center gap-[6px] flex-wrap text-[12px] text-muted">
                <span className="text-warn">★</span>
                <span className="text-ink font-semibold">{place.rating}</span>
                {place.reviewCount !== undefined && (
                  <span className="opacity-50">({formatCount(place.reviewCount)})</span>
                )}
                <span className="opacity-35">·</span>
                <span>{place.distance}</span>
              </div>
            </div>

            <div className="px-[14px] pt-[8px] flex justify-end">
              <span className="text-[9px] text-white/25">Powered by Google</span>
            </div>

            <div className="px-[14px] pt-[4px] pb-[14px]">
              <button
                onClick={() => onPin(place.id)}
                className="w-full py-[11px] rounded-[14px] font-syne text-[14px] font-extrabold flex items-center justify-center gap-[7px] transition-[filter] active:brightness-75"
                style={isPinned
                  ? {
                      background: "rgba(255,190,61,.12)",
                      border: "1px solid rgba(255,190,61,.28)",
                      color: "var(--warn)",
                    }
                  : { background: "var(--accent)", color: "#000" }}
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 14 14"><path d="M7 1l1.3 4h4.2l-3.4 2.5 1.3 4L7 9.1 3.6 11.5l1.3-4L1.5 5H5.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                {isPinned ? "Pinned ✓" : "Pin to Shortlist"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default PlaceDetail;
