import { useEffect, useRef, useState } from "react";

type Props = {
  note?: string;
  borderColor: string;
  onSave: (note: string) => void;
};

const MAX = 120;

const PencilIcon = () => (
  <svg width="11" height="11" fill="none" viewBox="0 0 14 14">
    <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon = () => (
  <svg width="9" height="9" fill="none" viewBox="0 0 12 12">
    <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function NoteStrip({ note, borderColor, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(note ?? "");
    setEditing(false);
  }, [note]);

  function startEdit() {
    setDraft(note ?? "");
    setEditing(true);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function save() {
    onSave(draft.trim());
    setEditing(false);
  }

  function clear() {
    onSave("");
    setDraft("");
    setEditing(false);
  }

  return (
    <div className={`bg-surface border-x border-b rounded-b-[14px] mb-1 ${borderColor}`}>
      {editing ? (
        <div className="px-[13px] py-[10px]">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
            placeholder="Add a note for the group..."
            rows={2}
            className="w-full bg-surface-2 rounded-[10px] px-[10px] py-[8px] text-[12.5px] text-ink placeholder:text-muted/50 resize-none outline-none border border-white/[0.08] focus:border-accent/40 transition-colors leading-[1.5]"
          />
          <div className="flex items-center justify-between mt-[7px]">
            <span className="text-[10px] text-muted/40 font-mono">{draft.length}/{MAX}</span>
            <div className="flex items-center gap-[5px]">
              <button
                onClick={() => setEditing(false)}
                className="px-[10px] py-[5px] rounded-[8px] text-[11.5px] font-semibold text-muted active:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-[10px] py-[5px] rounded-[8px] text-[11.5px] font-bold bg-accent/[0.12] border border-accent/[0.28] text-accent active:bg-accent/20 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : note ? (
        <div className="px-[13px] py-[9px] flex items-start gap-[8px]">
          <span className="text-muted/35 flex-shrink-0 mt-[2px]">
            <PencilIcon />
          </span>
          <p className="flex-1 min-w-0 text-[12px] text-ink/65 italic leading-[1.45] line-clamp-2">
            {note}
          </p>
          <div className="flex items-center gap-[8px] flex-shrink-0">
            <button onClick={startEdit} className="text-muted/40 active:text-muted transition-colors" aria-label="Edit note">
              <PencilIcon />
            </button>
            <button onClick={clear} className="text-muted/30 active:text-rose-400 transition-colors" aria-label="Clear note">
              <XIcon />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="w-full px-[13px] py-[8px] flex items-center gap-[6px] text-left active:bg-surface-2 transition-colors rounded-b-[14px]"
        >
          <span className="text-muted/30 flex-shrink-0">
            <PencilIcon />
          </span>
          <span className="text-[11.5px] text-muted/30 italic">Add a note...</span>
        </button>
      )}
    </div>
  );
}
