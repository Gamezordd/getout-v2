type Props = {
  location: string;
  onChange: () => void;
};

export default function LocationBar({ location, onChange }: Props) {
  return (
    <div
      onClick={onChange}
      className="flex items-center gap-[7px] px-4 py-[6px] bg-surface border-b border-white/[0.07] cursor-pointer active:bg-surface-2"
    >
      <svg width="12" height="12" fill="none" viewBox="0 0 14 14">
        <path d="M7 1C4.79 1 3 2.79 3 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4z" stroke="#00e5a0" strokeWidth="1.3" />
        <circle cx="7" cy="5" r="1.5" fill="#00e5a0" />
      </svg>
      <span className="flex-1 text-[12px] font-medium text-ink truncate">{location}</span>
      <span className="text-[11px] font-semibold text-accent flex-shrink-0">Change</span>
    </div>
  );
}
