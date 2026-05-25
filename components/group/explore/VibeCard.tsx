import { useEffect, useRef, useState } from "react";
import type { GroupMember, Place } from "@/types/group";
import type { MemberTravel } from "@/types/travel";
import type { VibeTag } from "@/types/explore";

export type VibeResult = Place & {
  vibeDistance?: number;
  memberTravel?: MemberTravel[];
  priceLevel?: number;
  address?: string;
};

type Speed = "fast" | "yellow" | "mid" | "slow";

function classifySpeed(seconds: number): Speed {
  const m = seconds / 60;
  if (m < 20) return "fast";
  if (m < 45) return "yellow";
  if (m < 60) return "mid";
  return "slow";
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

const SPEED_BAR: Record<Speed, string> = {
  fast:   "bg-[#00e5a0]",
  yellow: "bg-[#ffbe3d]",
  mid:    "bg-[#ff9a3c]",
  slow:   "bg-[#ff5c5c]",
};

const SPEED_TEXT: Record<Speed, string> = {
  fast:   "text-[#00e5a0]",
  yellow: "text-[#ffbe3d]",
  mid:    "text-[#ff9a3c]",
  slow:   "text-[#ff5c5c]",
};

const AUTO_ADVANCE_MS = 2600;
const VISIBILITY_THRESHOLD = 0.6;

type Props = {
  result: VibeResult;
  images: string[];
  members: GroupMember[];
  isPinned: boolean;
  animDelay: number;
  onPin: (place: Place) => void;
  vibeTags?: VibeTag[];
};

export function VibeCard({ result, images, members, isPinned, animDelay, onPin, vibeTags = [] }: Props) {
  const [pinned, setPinned] = useState(isPinned);
  const [activeIdx, setActiveIdx] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [loadedIdxs, setLoadedIdxs] = useState<Set<number>>(new Set());
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const photos = images.slice(0, 6);

  useEffect(() => {
    setActiveIdx(0);
    setHeroLoaded(false);
    setLoadedIdxs(new Set());
  }, [result.id]);

  useEffect(() => {
    setHeroLoaded(loadedIdxs.has(activeIdx));
  }, [activeIdx, loadedIdxs]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setIsVisible(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD),
      { threshold: [0, VISIBILITY_THRESHOLD, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (photos.length <= 1 || !isVisible) return;
    const id = window.setInterval(() => setActiveIdx((i) => (i + 1) % photos.length), AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [photos.length, isVisible]);

  useEffect(() => {
    const strip = thumbStripRef.current;
    const thumb = thumbRefs.current[activeIdx];
    if (!strip || !thumb) return;
    const target = thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeIdx]);

  const matchPct = result.vibeDistance !== undefined ? Math.round((1 - result.vibeDistance) * 100) : null;
  const matchBadgeClass =
    matchPct === null ? ""
    : matchPct >= 75 ? "border-[rgba(0,229,160,0.3)] bg-[rgba(0,229,160,0.15)] text-[#00e5a0]"
    : matchPct >= 50 ? "border-[rgba(61,142,245,0.3)] bg-[rgba(61,142,245,0.15)] text-[#80b0ff]"
    : "border-white/10 bg-white/5 text-[#8b8b9c]";

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const travelRows = (result.memberTravel ?? [])
    .map((t) => {
      const member = memberMap.get(t.memberId);
      if (!member) return null;
      return { member, seconds: t.durationSeconds, speed: classifySpeed(t.durationSeconds) };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.seconds - b.seconds);
  const maxEtaSec = Math.max(...travelRows.map((r) => r.seconds), 3600, 1);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [result.name, result.address].filter(Boolean).join(" ").trim(),
  )}`;

  function handlePin() {
    if (pinned) return;
    setPinned(true);
    onPin(result);
  }

  const activeUrl = photos[activeIdx] ?? null;

  return (
    <div
      ref={cardRef}
      className="w-full rounded-[24px] border border-white/10 bg-[#141418] shadow-[0_18px_40px_rgba(0,0,0,0.22)] overflow-hidden"
      style={{ animation: "chipPop 0.25s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${animDelay}ms` }}
    >
      <div className="relative h-[160px] bg-[#1a1a22]">
        {activeUrl ? (
          <>
            {!heroLoaded && (
              <div className="absolute inset-0 animate-pulse bg-[linear-gradient(135deg,#1b1b22,#262633,#1b1b22)]" />
            )}
            <img
              src={activeUrl}
              alt={result.name}
              className={`h-full w-full object-cover transition-opacity duration-300 ${heroLoaded ? "opacity-100" : "opacity-0"}`}
              loading="lazy"
              onLoad={() => setLoadedIdxs((s) => { const n = new Set(s); n.add(activeIdx); return n; })}
            />
          </>
        ) : (
          <div className="absolute inset-0 animate-pulse bg-[linear-gradient(135deg,#1b1b22,#262633,#1b1b22)] flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2l1.5 4.5H16l-3.7 2.7 1.4 4.3L10 11 6.3 13.5l1.4-4.3L4 6.5h4.5L10 2z" fill="#00e5a0" opacity="0.25" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,14,0.92)] via-[rgba(10,10,14,0.3)] to-transparent" />
        {photos.length > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-[rgba(10,10,14,0.68)] px-2.5 py-1 font-syne text-[11px] font-semibold text-white backdrop-blur-sm">
            {photos.length} photos
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-syne text-[17px] font-bold tracking-[-0.03em] text-white truncate leading-tight">
              {result.name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs">
              {result.rating && (
                <span className="inline-flex items-center gap-1 text-[#ffbe3d]">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  {result.rating}
                </span>
              )}
              {result.type && <span className="text-white/60">{result.type}</span>}
            </div>
          </div>
          {matchPct !== null && (
            <div className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-[0.04em] ${matchBadgeClass}`}>
              {matchPct}% match
            </div>
          )}
        </div>
      </div>

      {photos.length > 1 && (
        <div
          ref={thumbStripRef}
          className="flex gap-2 overflow-x-auto px-4 pb-1 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((url, idx) => (
            <button
              key={idx}
              type="button"
              ref={(el) => { thumbRefs.current[idx] = el; }}
              onClick={() => setActiveIdx(idx)}
              className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-2xl border transition ${idx === activeIdx ? "border-[#00e5a0]" : "border-white/10 opacity-75"}`}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                onLoad={() => setLoadedIdxs((s) => { const n = new Set(s); n.add(idx); return n; })}
                className={`h-full w-full object-cover transition-opacity duration-300 ${loadedIdxs.has(idx) ? "opacity-100" : "opacity-0"}`}
              />
            </button>
          ))}
        </div>
      )}

      <div className="mx-4 mt-3 rounded-[18px] bg-[#1c1c22] px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#727287]">Travel times</p>
        {travelRows.length > 0 ? (
          <div className="mt-2.5 space-y-2.5">
            {travelRows.map(({ member, seconds, speed }) => {
              const width = Math.max(8, Math.round((seconds / maxEtaSec) * 100));
              return (
                <div key={member.id} className="flex items-center gap-2.5">
                  <div
                    className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: member.color, color: member.textColor ?? "#fff" }}
                  >
                    {member.initial}
                  </div>
                  <p className="w-[52px] shrink-0 truncate text-xs text-[#8b8b9c]">{member.name}</p>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#24242d]">
                    <div className={`h-full rounded-full ${SPEED_BAR[speed]}`} style={{ width: `${width}%` }} />
                  </div>
                  <p className={`w-10 text-right font-syne text-xs font-bold ${SPEED_TEXT[speed]}`}>
                    {formatDuration(seconds)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-1 text-xs text-[#8b8b9c]">Travel times appear after members allow precise location.</p>
        )}
      </div>

      {vibeTags.length > 0 && (
        <div className="flex flex-wrap gap-[6px] px-4 py-2">
          {vibeTags.map((t) => (
            <span key={t.label} className="rounded-full border border-white/[0.08] bg-[#1c1c22] px-2.5 py-[5px] text-[11px] text-[#b0b0bf]">{t.emoji} {t.label}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          {result.priceLevel && (
            <span className="text-sm text-[#8b8b9c]">{"$".repeat(result.priceLevel)}</span>
          )}
          {result.address && (
            <span className="inline-flex items-center gap-1 text-[#b0b0bf] min-w-0">
              {result.priceLevel && <span className="text-[#5f5f70]">·</span>}
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#8b8b9c]">
                <path d="M10 2a6 6 0 0 1 6 6c0 4.418-4.5 8.667-5.37 9.46a1 1 0 0 1-1.26 0C8.5 16.667 4 12.418 4 8a6 6 0 0 1 6-6Zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
              </svg>
              <span className="truncate text-sm">{result.address}</span>
            </span>
          )}
        </div>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 rounded-full border border-white/10 bg-[#1c1c22] px-2.5 py-1 text-[11px] text-[#f0f0f5]"
        >
          Open in Maps
        </a>
      </div>

      <div className="mx-4 mt-3 h-px bg-white/10" />
      <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-3">
        <p className="text-xs text-[#5a5a70]">
          {pinned ? "📌 Group can now vote on this" : "Tap to put up for a group vote"}
        </p>
        <button
          type="button"
          onClick={handlePin}
          disabled={pinned}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
            pinned
              ? "border border-[#ffbe3d]/30 bg-[rgba(255,190,61,0.12)] text-[#ffbe3d]"
              : "border border-white/10 bg-[#1c1c22] text-[#8b8b9c] hover:border-[#ffbe3d]/30 hover:text-[#ffbe3d]"
          }`}
        >
          {pinned ? "📌 Pinned" : "📌 Pin"}
        </button>
      </div>
    </div>
  );
}
