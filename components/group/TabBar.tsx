export type Tab = "shortlist" | "explore";

type Props = {
  active: Tab;
  shortlistCount: number;
  onChange: (tab: Tab) => void;
};

export default function TabBar({ active, shortlistCount, onChange }: Props) {
  return (
    <div className="flex px-4 border-b border-white/[0.07] bg-bg flex-shrink-0">
      <TabButton label="Shortlist" isActive={active === "shortlist"} badge={shortlistCount} onClick={() => onChange("shortlist")} />
      <TabButton label="Explore" isActive={active === "explore"} onClick={() => onChange("explore")} />
    </div>
  );
}

type TabButtonProps = {
  label: string;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
};

function TabButton({ label, isActive, badge, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-[6px] px-4 py-[10px] pb-[11px] border-b-[2.5px] -mb-px transition-colors duration-150 font-semibold text-[13px] whitespace-nowrap ${
        isActive ? "text-ink border-accent" : "text-muted border-transparent"
      }`}
    >
      {label}
      {badge !== undefined && (
        <span
          className={`min-w-[18px] h-[18px] rounded-[9px] px-[5px] flex items-center justify-center text-[10px] font-bold font-syne border transition-all duration-200 ${
            isActive ? "bg-accent text-black border-accent" : "bg-surface-2 text-muted border-white/[0.07]"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
