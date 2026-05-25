import type { VibeTag } from "@/types/explore";

type ReviewSnippet = { rating?: number; text: string };
type RawTag = { emoji?: unknown; label?: unknown };
type ChatResponse = { choices?: Array<{ message?: { content?: string } }> };

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

function getGoogleKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_MAPS_API_KEY");
  return key;
}

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  return key;
}

function getLLMModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

type PlaceDetails = { editorialSummary?: string; reviews: ReviewSnippet[] };

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": getGoogleKey(),
        "X-Goog-FieldMask": "editorialSummary,reviews.rating,reviews.text,reviews.originalText",
      },
    },
  );
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data) return null;

  const editorialSummary: string | undefined =
    typeof data.editorialSummary?.text === "string" ? data.editorialSummary.text : undefined;

  const reviews: ReviewSnippet[] = (Array.isArray(data.reviews) ? data.reviews : [])
    .map((r: Record<string, unknown>) => {
      const text =
        (r.text as Record<string, string> | undefined)?.text ||
        (r.originalText as Record<string, string> | undefined)?.text ||
        "";
      const rating = typeof r.rating === "number" ? r.rating : undefined;
      return text.trim().length > 0 ? { text: text.trim(), rating } : null;
    })
    .filter((r): r is ReviewSnippet => r !== null)
    .slice(0, 5);

  return { editorialSummary, reviews };
}

function buildPrompt(placeName: string, details: PlaceDetails): string {
  const parts: string[] = [`Venue: ${placeName}`];
  if (details.editorialSummary) parts.push(`Summary: ${details.editorialSummary}`);
  if (details.reviews.length > 0) {
    parts.push(
      "Reviews:\n" +
        details.reviews
          .map((r, i) => `${i + 1}. ${r.rating ? `[${r.rating}★] ` : ""}${r.text}`)
          .join("\n"),
    );
  }
  return parts.length > 1 ? parts.join("\n\n") : "";
}

function sanitizeTags(raw: unknown): VibeTag[] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const tags: VibeTag[] = [];
  for (const item of raw as RawTag[]) {
    const emoji = typeof item.emoji === "string" ? item.emoji.trim() : "";
    const label = typeof item.label === "string" ? item.label.trim().slice(0, 30) : "";
    if (!emoji || !label) return null;
    tags.push({ emoji, label });
  }
  return tags;
}

const SYSTEM_PROMPT = [
  "You are a venue analyst for a group decision app.",
  "Given venue information, return exactly 4 vibe tags.",
  "Rules:",
  "- Each tag has exactly one emoji and 1-3 words",
  "- Examples: {\"emoji\":\"🌃\",\"label\":\"Rooftop Views\"}, {\"emoji\":\"🎵\",\"label\":\"Live Music\"}",
  "- Cover atmosphere, energy/crowd, a standout feature, and price or accessibility",
  "- Don't repeat the same vibe (e.g., don't use multiple food emojis or multiple tags about crowds)",
  "- Don't mention the venue name or generic tags like 'good for groups'",
  "- Don't mention COVID or temporary conditions",
  "- Don't use emojis that are too similar (e.g., avoid multiple food emojis)",
  "- Don't use emojis that are too generic (e.g., avoid '🌅')",
  "- Don't mention price.",
  "- Be concrete and vivid, based only on the provided text",
  "- Return strict JSON: {\"tags\":[{\"emoji\":\"...\",\"label\":\"...\"}]}",
].join("\n");

export async function fetchPlaceVibeTags(
  placeId: string,
  placeName: string,
): Promise<VibeTag[] | null> {
  const details = await fetchPlaceDetails(placeId);
  if (!details) return null;
  const prompt = buildPrompt(placeName, details);
  if (!prompt) return null;

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: getLLMModel(),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as ChatResponse | null;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content) as { tags?: unknown };
  return sanitizeTags(parsed?.tags);
}
