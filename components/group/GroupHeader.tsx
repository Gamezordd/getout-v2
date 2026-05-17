import Avatar from "@/components/ui/Avatar";
import type { GroupMember } from "@/types/group";

type Props = {
  name: string;
  subtitle: string;
  members: GroupMember[];
  onBack: () => void;
  onShare: () => void;
};

export default function GroupHeader({ name, subtitle, members, onBack, onShare }: Props) {
  const visible = members.slice(0, 3);
  const extra = members.length - 3;

  return (
    <div className="flex items-center gap-3 px-4 pt-2 pb-[10px] border-b border-white/[0.07] bg-bg">
      <button
        onClick={onBack}
        className="w-[34px] h-[34px] rounded-[10px] bg-surface-2 border border-white/[0.07] flex items-center justify-center text-muted flex-shrink-0"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <div className="font-syne text-[16px] font-bold tracking-[-0.2px] text-ink truncate">{name}</div>
        <div className="text-[11px] text-muted mt-[1px]">{subtitle}</div>
      </div>

      <div className="flex items-center gap-[10px] flex-shrink-0">
        <button
          onClick={onShare}
          className="w-[34px] h-[34px] rounded-[10px] bg-surface-2 border border-white/[0.07] flex items-center justify-center text-muted active:text-ink"
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 16 16">
            <circle cx="12" cy="3" r="1.8" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="12" cy="13" r="1.8" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="4" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5.7 7.1L10.3 4.4M5.7 8.9l4.6 2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex">
          {visible.map((m, i) => (
            <Avatar key={m.id} initial={m.initial} color={m.color} textColor={m.textColor} size={30} isFirst={i === 0} />
          ))}
          {extra > 0 && (
            <div
              style={{ marginLeft: -9, border: "2.5px solid #0a0a0d" }}
              className="w-[30px] h-[30px] rounded-full bg-surface-2 flex items-center justify-center text-[10px] font-bold text-muted flex-shrink-0"
            >
              +{extra}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
