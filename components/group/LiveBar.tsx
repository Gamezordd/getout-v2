import Avatar from "@/components/ui/Avatar";
import type { GroupMember } from "@/types/group";

type Props = {
  activeMembers: GroupMember[];
  decidingCount: number;
  pinnedCount: number;
};

export default function LiveBar({ activeMembers, decidingCount, pinnedCount }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-[7px] border-b border-white/[0.07] bg-bg">
      <div className="w-[6px] h-[6px] rounded-full bg-live animate-blink flex-shrink-0" />
      <p className="text-[11.5px] text-muted flex-1">
        <strong className="text-ink font-medium">{decidingCount} people</strong> deciding ·{" "}
        <strong className="text-ink font-medium">{pinnedCount} pinned</strong>
      </p>
      <div className="flex">
        {activeMembers.map((m, i) => (
          <Avatar key={m.id} initial={m.initial} color={m.color} textColor={m.textColor} size={20} overlap={5} isFirst={i === 0} />
        ))}
      </div>
    </div>
  );
}
