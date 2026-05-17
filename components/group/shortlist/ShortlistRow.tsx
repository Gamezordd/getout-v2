import Avatar from "@/components/ui/Avatar";
import type { GroupMember, Place } from "@/types/group";

type Props = {
  place: Place;
  rank: number;
  isLeader: boolean;
  isVoted: boolean;
  votePercent: number;
  pinnedBy: GroupMember;
  onVote: () => void;
  onUnpin: () => void;
  style?: React.CSSProperties;
};

export default function ShortlistRow({ place, rank, isLeader, isVoted, votePercent, pinnedBy, onVote, onUnpin, style }: Props) {
  return (
    <div style={style} className="animate-slide-up">
      <div
        className={`flex items-center gap-[11px] px-[13px] py-[10px] bg-surface rounded-[14px] mb-1 border ${
          isLeader ? "border-accent/[0.28]" : "border-white/[0.07]"
        }`}
      >
        <div className="w-11 h-11 rounded-[11px] overflow-hidden flex-shrink-0 bg-surface-2 relative">
          <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover brightness-75" />
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
              {place.distance}
            </span>
            <div className="w-[2px] h-[2px] rounded-full bg-muted" />
            <span className="text-[11px] text-muted">{place.type} · {place.rating}</span>
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
