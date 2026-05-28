import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import NoteStrip from "./NoteStrip";
import type { GroupMember, Place } from "@/types/group";
import type { MemberTravel } from "@/types/travel";
import type { VibeTag } from "@/types/explore";

type Props = {
  place: Place;
  rank: number;
  isLeader: boolean;
  isVoted: boolean;
  votePercent: number;
  pinnedBy: GroupMember;
  members: GroupMember[];
  memberTravel?: MemberTravel[];
  images?: string[];
  vibeTags?: VibeTag[];
  note?: string;
  autoplay?: boolean;
  onVote: () => void;
  onUnpin: () => void;
  onNoteChange: (note: string) => void;
  style?: React.CSSProperties;
};

type Speed = "fast" | "yellow" | "mid" | "slow";

function classifySpeed(seconds: number): Speed {
  const mins = seconds / 60;
  if (mins < 20) return "fast";
  if (mins < 45) return "yellow";
  if (mins < 60) return "mid";
  return "slow";
}

function formatDuration(seconds: number): string {
  const totalMins = Math.round(seconds / 60);
  if (totalMins < 60) return `${totalMins}m`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const SPEED_RING: Record<Speed, string> = {
  fast: "ring-[1.5px] ring-accent",
  yellow: "ring-[1.5px] ring-yellow-400",
  mid: "ring-[1.5px] ring-amber-500",
  slow: "ring-[1.5px] ring-red-500",
};

const SPEED_TEXT: Record<Speed, string> = {
  fast: "text-accent",
  yellow: "text-yellow-400",
  mid: "text-amber-500",
  slow: "text-red-500",
};

type TravelChip = {
  member: GroupMember;
  seconds: number;
  speed: Speed;
  isYou: boolean;
};

function buildChips(memberTravel: MemberTravel[], members: GroupMember[]): TravelChip[] {
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const chips: TravelChip[] = [];

  for (const t of memberTravel) {
    const member = memberMap.get(t.memberId);
    if (!member) continue;
    chips.push({
      member,
      seconds: t.durationSeconds,
      speed: classifySpeed(t.durationSeconds),
      isYou: member.name === "You",
    });
  }

  return chips.sort((a, b) => {
    if (a.isYou !== b.isYou) return a.isYou ? -1 : 1;
    return b.seconds - a.seconds;
  });
}

type TravelStripProps = {
  memberTravel: MemberTravel[];
  members: GroupMember[];
};

function TravelStrip({ memberTravel, members }: TravelStripProps) {
  const [expanded, setExpanded] = useState(false);
  const chips = buildChips(memberTravel, members);
  if (chips.length === 0) return null;

  const sorted = [...chips].sort((a, b) => a.seconds - b.seconds);
  const minLabel = formatDuration(sorted[0].seconds);
  const maxLabel = formatDuration(sorted[sorted.length - 1].seconds);
  const rangeLabel = minLabel === maxLabel ? minLabel : `${minLabel}–${maxLabel}`;

  const visible = chips.slice(0, 3);
  const overflow = chips.slice(3);
  const showOverflow = expanded ? overflow : [];
  const overflowCount = overflow.length;

  return (
    <div className="mt-[2px] mx-[13px] mb-1 pt-[8px] border-t border-white/[0.07]">
      <div className="flex items-center justify-between mb-[7px]">
        <div className="flex items-center gap-[5px] text-[11px] font-semibold text-muted">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 8.5h1M9.5 8.5h1M2 5.5l.8-2.5h6.4l.8 2.5H2zM1.5 5.5h9v3H1.5v-3z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Travel times
        </div>
        <span className="font-syne text-[11px] font-bold text-ink">{rangeLabel}</span>
      </div>

      <div className="flex items-start gap-[8px] flex-wrap">
        {visible.map((chip) => (
          <TravelChipItem key={chip.member.id} chip={chip} />
        ))}
        {showOverflow.map((chip) => (
          <TravelChipItem key={chip.member.id} chip={chip} />
        ))}
        {!expanded && overflowCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex flex-col items-center gap-[2px] min-w-[28px]"
          >
            <div className="w-7 h-7 rounded-full bg-surface-2 border border-white/[0.12] flex items-center justify-center text-[9px] font-bold text-muted">
              +{overflowCount}
            </div>
            <span className="text-[9px] text-muted">more</span>
          </button>
        )}
      </div>
    </div>
  );
}

function TravelChipItem({ chip }: { chip: TravelChip }) {
  return (
    <div className="flex flex-col items-center gap-[2px] min-w-[28px]">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${SPEED_RING[chip.speed]}`}
        style={{ background: chip.member.color, color: chip.member.textColor ?? "#fff" }}
      >
        {chip.member.initial}
      </div>
      <span className={`text-[9px] font-semibold ${SPEED_TEXT[chip.speed]}`}>{formatDuration(chip.seconds)}</span>
    </div>
  );
}

function PhotoStrip({ images, activeIdx, onSelect, borderColor, autoplay }: {
  images: string[]; activeIdx: number; onSelect: (i: number) => void;
  borderColor: string; autoplay: boolean;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!autoplay) return;
    const strip = stripRef.current;
    const btn = btnRefs.current[activeIdx];
    if (!strip || !btn) return;
    const target = btn.offsetLeft - (strip.clientWidth - btn.clientWidth) / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeIdx, autoplay]);

  return (
    <div ref={stripRef} className={`flex gap-2 overflow-x-auto bg-surface border-x px-3 pt-2 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${borderColor}`}>
      {images.map((url, i) => (
        <button key={i} type="button" ref={(el) => { btnRefs.current[i] = el; }} onClick={() => onSelect(i)}
          className={`shrink-0 h-[88px] w-[120px] rounded-[10px] overflow-hidden border-2 transition-colors ${autoplay && i === activeIdx ? "border-accent" : "border-transparent"}`}
        >
          <img src={url} className="h-full w-full object-cover" loading="lazy" alt="" />
        </button>
      ))}
    </div>
  );
}

const CHIP_PALETTES = [
  { border: "rgba(0,229,160,0.30)",  bg: "rgba(0,229,160,0.09)",  text: "#7fffd4" },
  { border: "rgba(61,142,245,0.30)", bg: "rgba(61,142,245,0.09)", text: "#90b8ff" },
  { border: "rgba(255,190,61,0.28)", bg: "rgba(255,190,61,0.08)", text: "#ffd570" },
  { border: "rgba(192,132,252,0.30)",bg: "rgba(192,132,252,0.09)",text: "#d8a8ff" },
] as const;

function ChipStrip({ tags, borderColor }: { tags: VibeTag[]; borderColor: string }) {
  return (
    <div className={`flex gap-[6px] px-[13px] py-[8px] bg-surface border-x overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${borderColor}`}>
      {tags.map((t, i) => {
        const p = CHIP_PALETTES[i % CHIP_PALETTES.length];
        return (
          <span key={t.label} className="shrink-0 rounded-full px-2.5 py-[4px] text-[10.5px] font-semibold whitespace-nowrap"
            style={{ border: `1px solid ${p.border}`, background: p.bg, color: p.text }}>
            {t.emoji} {t.label}
          </span>
        );
      })}
    </div>
  );
}

export default function ShortlistRow({ place, rank, isLeader, isVoted, votePercent, pinnedBy, members, memberTravel, images, vibeTags, note, autoplay = false, onVote, onUnpin, onNoteChange, style }: Props) {
  const hasTravel = !!memberTravel && memberTravel.length > 0;
  const hasChips = !!vibeTags && vibeTags.length > 0;
  const hasCarousel = !!images && images.length > 1;
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!autoplay || !images || images.length <= 1) return;
    const id = window.setInterval(() => setActiveIdx((i) => (i + 1) % images.length), 2500);
    return () => window.clearInterval(id);
  }, [autoplay, images?.length]);

  const borderColor = isLeader ? "border-accent/[0.28]" : "border-white/[0.07]";

  return (
    <div style={style} className="animate-slide-up">
      <div
        className={`flex items-center gap-[11px] px-[13px] py-[10px] bg-surface rounded-t-[14px] border-x border-t ${borderColor}`}
      >
        <div className="w-11 h-11 rounded-[11px] overflow-hidden flex-shrink-0 bg-surface-2 relative">
          <img src={images?.[0] ?? place.imageUrl} alt={place.name} className="w-full h-full object-cover brightness-75" />
          <div
            className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-[5px] flex items-center justify-center font-syne text-[9px] font-extrabold ${
              isLeader ? "bg-accent text-black" : "bg-black/65 text-ink"
            }`}
          >
            {rank}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-syne text-[14px] font-bold tracking-[-0.1px] text-ink truncate mb-[2px]">{place.name}</div>
          <div className="flex items-center gap-[5px] flex-wrap">
            <span className="text-[11px] font-semibold text-accent flex items-center gap-[2px]">
              <svg width="9" height="9" fill="none" viewBox="0 0 10 10">
                <path d="M5 1C3.34 1 2 2.34 2 4c0 2.5 3 5.5 3 5.5S8 6.5 8 4c0-1.66-1.34-3-3-3z" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              {place.area ?? place.distance}
            </span>
            <div className="w-[2px] h-[2px] rounded-full bg-muted" />
            <span className="text-[11px] text-muted flex items-center gap-[3px]">
              {place.type}
              <div className="w-[2px] h-[2px] rounded-full bg-muted" />
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-[10px] h-[10px] text-[#ffbe3d]">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {place.rating}
            </span>
            {place.openNow !== undefined && (
              <span className={`text-[10px] font-semibold px-[6px] py-[2px] rounded-[6px] ${
                place.openNow
                  ? "bg-accent/10 border border-accent/25 text-accent"
                  : "bg-white/[0.04] border border-white/[0.08] text-muted"
              }`}>
                {place.openNow ? "Open" : "Closed"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-[2px]">
            <Avatar initial={pinnedBy.initial} color={pinnedBy.color} textColor={pinnedBy.textColor} size={13} isFirst />
            <span className="text-[10.5px] text-muted">
              {pinnedBy.name === "You" ? "Pinned by you" : `Pinned by ${pinnedBy.name}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-[6px] flex-shrink-0">
          <button
            onClick={onUnpin}
            className="w-[30px] h-[30px] rounded-[9px] border border-white/[0.07] flex items-center justify-center text-muted active:bg-surface-2 flex-shrink-0"
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 12 12">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={onVote}
            className={`flex items-center gap-1 px-[14px] py-[7px] rounded-[20px] text-[12px] font-bold transition-all duration-150 whitespace-nowrap ${
              isVoted
                ? "bg-accent text-black"
                : "bg-surface-2 text-muted border border-white/[0.07] active:bg-surface-3 active:text-ink"
            }`}
          >
            {isVoted && (
              <svg width="11" height="11" fill="none" viewBox="0 0 13 13">
                <path d="M2 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isVoted ? "Voted" : "Vote"}
          </button>
        </div>
      </div>

      {hasCarousel && (
        <PhotoStrip images={images!} activeIdx={activeIdx} onSelect={setActiveIdx}
          borderColor={borderColor} autoplay={autoplay}
        />
      )}
      {hasTravel && (
        <div className={`bg-surface border-x ${borderColor}`}>
          <TravelStrip memberTravel={memberTravel!} members={members} />
        </div>
      )}
      {hasChips && <ChipStrip tags={vibeTags!} borderColor={borderColor} />}
      <NoteStrip note={note} borderColor={borderColor} onSave={onNoteChange} />

      <div className="h-[3px] bg-surface-2 rounded-[2px] overflow-hidden mx-[13px] mb-1">
        <div
          className="h-full rounded-[2px] transition-[width] duration-700"
          style={{
            width: `${votePercent}%`,
            background: votePercent > 0 ? "#00e5a0" : "linear-gradient(90deg,#3a3a55,#4a4a70)",
          }}
        />
      </div>
    </div>
  );
}
