import type { PinnedPlace } from "@/types/group";

type Props = {
  leader: PinnedPlace | null;
  onFinalize: () => void;
};

export default function FinalizeBar({ leader, onFinalize }: Props) {
  if (!leader) return null;

  const voteCount = Math.round((leader.votePercent / 100) * 3);

  return (
    <div className="absolute bottom-0 left-0 right-0 px-[14px] pb-6 pt-10 bg-gradient-to-b from-transparent to-bg pointer-events-none">
      <div className="bg-gradient-to-br from-[#0f1f18] to-[#141a18] border border-accent/[0.28] rounded-[18px] px-4 py-[13px] flex items-center gap-3 pointer-events-auto">
        <div className="flex-1">
          <div className="font-syne text-[10px] font-bold text-accent uppercase tracking-[0.6px] mb-[2px]">
            Leading · {voteCount} vote{voteCount !== 1 ? "s" : ""}
          </div>
          <div className="font-syne text-[16px] font-extrabold tracking-[-0.2px] text-ink">{leader.place.name}</div>
          <div className="text-[11px] text-muted mt-[1px]">Tap to lock in and end voting</div>
        </div>
        <button
          onClick={onFinalize}
          className="bg-accent text-black font-syne text-[14px] font-extrabold px-[18px] py-[10px] rounded-[14px] flex items-center gap-[6px] flex-shrink-0 active:brightness-90 whitespace-nowrap"
        >
          Lock in 🎯
        </button>
      </div>
    </div>
  );
}
