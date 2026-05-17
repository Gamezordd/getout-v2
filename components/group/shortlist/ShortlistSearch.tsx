import { useState, useRef } from "react";
import type { Place } from "@/types/group";

type Props = {
  places: Place[];
  pinnedIds: Set<string>;
  onPin: (place: Place) => void;
};

export default function ShortlistSearch({ places, pinnedIds, onPin }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = (query ? places.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())) : places).slice(0, 6);

  function handlePin(place: Place) {
    if (!pinnedIds.has(place.id)) onPin(place);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="px-[14px] pt-3 pb-2 flex-shrink-0 relative z-10">
      <div
        className={`flex items-center gap-[9px] bg-surface border-[1.5px] rounded-[14px] px-[14px] py-[10px] transition-colors duration-200 ${
          open ? "border-accent/[0.28]" : "border-white/[0.07]"
        }`}
      >
        <svg className="text-muted flex-shrink-0" width="15" height="15" fill="none" viewBox="0 0 16 16">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search a place to pin…"
          autoComplete="off"
          className="flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-muted"
        />
        {!query && <span className="text-[11px] text-muted flex-shrink-0">↵ to pin</span>}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-[70px] left-[14px] right-[14px] bg-surface border border-white/[0.13] rounded-[14px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 animate-slide-up">
          {results.map((place) => {
            const isPinned = pinnedIds.has(place.id);
            return (
              <div key={place.id} className="flex items-center gap-[11px] px-[14px] py-[11px] border-b border-white/[0.07] last:border-b-0 active:bg-surface-2">
                <div className="w-9 h-9 rounded-[10px] overflow-hidden flex-shrink-0 bg-surface-2">
                  <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover brightness-75" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-ink truncate">{place.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted mt-[2px]">
                    <span className="font-semibold text-accent">{place.distance}</span>
                    <span>· {place.type} · {place.rating}</span>
                  </div>
                </div>
                <button
                  onMouseDown={(e) => { e.preventDefault(); handlePin(place); }}
                  className={`flex items-center gap-1 px-3 py-[6px] rounded-[20px] text-[11px] font-bold font-syne border flex-shrink-0 whitespace-nowrap transition-all duration-150 ${
                    isPinned
                      ? "bg-warn/10 border-warn/30 text-warn"
                      : "bg-accent/[0.11] border-accent/[0.28] text-accent active:bg-accent/20"
                  }`}
                >
                  📌 {isPinned ? "Pinned" : "Pin"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
