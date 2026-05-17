import { useState } from "react";
import { useRouter } from "next/router";
import { CATEGORY_META } from "@/lib/demoPlaces";
import type { Category } from "@/types/group";

const CATEGORIES: Category[] = ["coffee", "alcohol", "food"];

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<Category | null>(null);

  async function handleCreate(category: Category) {
    if (loading) return;
    setLoading(category);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) throw new Error("Failed");
      const { slug } = await res.json();
      await router.push(`/${slug}`);
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg text-ink max-w-[430px] mx-auto px-5">
      <header className="pt-16 pb-10">
        <h1 className="font-syne text-[32px] font-extrabold tracking-[-0.6px]">GetOut</h1>
        <p className="text-[14px] text-muted mt-1">Decide together, go together.</p>
      </header>

      <section className="flex flex-col gap-2">
        <p className="text-[11px] font-bold text-muted uppercase tracking-[0.7px] mb-1 px-1">
          What are you after?
        </p>
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const isLoading = loading === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCreate(cat)}
              disabled={!!loading}
              className="flex items-center gap-4 px-5 py-4 bg-surface border border-white/[0.07] rounded-[18px] text-left transition-colors duration-150 active:bg-surface-2 disabled:opacity-60"
            >
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0"
                style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}
              >
                {meta.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-syne text-[16px] font-bold text-ink">{meta.label}</div>
                <div className="text-[12px] text-muted mt-[2px]">{meta.desc}</div>
              </div>
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
              ) : (
                <svg className="text-muted flex-shrink-0" width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </section>

      <p className="text-center text-[11.5px] text-muted mt-10 leading-[1.6]">
        Creating a group generates a shareable link.<br />Anyone with the link can join and vote.
      </p>
    </div>
  );
}
