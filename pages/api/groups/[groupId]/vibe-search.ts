import type { NextApiRequest, NextApiResponse } from "next";
import {
  getCachedDeepQuery,
  upsertDeepQueryCache,
  searchPlacesBySemantic,
} from "@/lib/db/vibeSearch";
import { getGroupLocationState } from "@/lib/cache/groupLocations";
import { getGroupTravelCache, setGroupTravelCache } from "@/lib/cache/groupTravel";
import { fetchDistanceMatrix } from "@/lib/travel/distanceMatrix";
import type { Place } from "@/types/group";
import type { MemberTravel } from "@/types/travel";

type VibeResult = Place & { vibeDistance?: number; memberTravel?: MemberTravel[]; priceLevel?: number; address?: string };
type ResponseBody = { data: { results: VibeResult[] } } | { error: string };

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-large";

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  return key;
}

function getLLMModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function normalizeCacheKey(value: string) {
  return Array.from(
    new Set(value.split(/[\s,]+/).map((t) => t.trim().toLowerCase()).filter(Boolean)),
  )
    .sort()
    .join(" ");
}

function parseCityKey(raw: string): string {
  return raw.trim().toLowerCase();
}

async function expandWithLLM(rawQuery: string, category: string): Promise<string> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getOpenAIKey()}` },
    body: JSON.stringify({
      model: getLLMModel(),
      reasoning: { effort: "medium" },
      input: [
        `Query: "${rawQuery}"`,
        `Category: "${category}"`,
        "",
        "Write a short, dense description (1–2 sentences) representing this query as it would appear in reviews of a matching place.",
        "Explicitly include the core term. Use concrete, direct language. No lists.",
      ].join("\n"),
    }),
  });
  if (!response.ok) throw new Error(`LLM expansion failed: ${response.status}`);
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const text =
    typeof data?.output_text === "string"
      ? data.output_text
      : Array.isArray(data?.output)
        ? (data.output as Array<{ content?: Array<{ text?: string }> }>)
            .flatMap((item) => item?.content ?? [])
            .find((item) => typeof item?.text === "string")?.text ?? ""
        : "";
  const expanded = text.trim();
  if (!expanded) throw new Error("LLM expansion returned empty text");
  return expanded;
}

async function fetchEmbedding(text: string): Promise<number[]> {
  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getOpenAIKey()}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });
  if (!response.ok) throw new Error(`Embeddings API failed: ${response.status}`);
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const embedding = (data as { data?: Array<{ embedding?: unknown }> })?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) throw new Error("Embeddings API returned no vector");
  return embedding as number[];
}

async function resolveVector(
  normalizedQuery: string,
  rawQuery: string,
  category: string,
): Promise<number[]> {
  const cached = await getCachedDeepQuery(normalizedQuery, category);
  if (cached) return cached.semanticVector;

  const expandedQuery = await expandWithLLM(rawQuery, category);
  const semanticVector = await fetchEmbedding(expandedQuery);

  await upsertDeepQueryCache({
    normalizedQuery,
    category,
    expandedQuery,
    semanticVector,
    embeddingModel: EMBEDDING_MODEL,
    llmModel: getLLMModel(),
  });
  return semanticVector;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const groupId = typeof req.query.groupId === "string" ? req.query.groupId : null;
  const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const rawCityKey = typeof req.query.cityKey === "string" ? req.query.cityKey : "";
  const category = typeof req.query.category === "string" ? req.query.category : "";

  console.log("[vibe-search] query params:", { groupId, q: rawQuery, cityKey: rawCityKey, category });

  if (!groupId) return res.status(400).json({ error: "Missing groupId" });
  if (!category) return res.status(400).json({ error: "Missing category" });
  if (rawQuery.length < 2) return res.status(200).json({ data: { results: [] } });

  const cityKey = parseCityKey(rawCityKey) || null;
  console.log("[vibe-search] cityKey resolved:", cityKey);

  const normalizedQuery = normalizeCacheKey(rawQuery);

  try {
    const semanticVector = await resolveVector(normalizedQuery, rawQuery, category);

    console.log("[vibe-search] rawCityKey:", JSON.stringify(rawCityKey), "→ cityKey:", JSON.stringify(cityKey), "category:", category);

    const vibePlaces = await searchPlacesBySemantic({
      cityKey,
      category,
      semanticVector,
      limit: 8,
    });

    console.log("[vibe-search] results:", vibePlaces.length);

    if (vibePlaces.length === 0) return res.status(200).json({ data: { results: [] } });

    const [locationState, travelCache] = await Promise.all([
      getGroupLocationState(groupId),
      getGroupTravelCache(groupId),
    ]);

    const preciseMembers = locationState.preciseLocations;

    if (preciseMembers.length > 0) {
      const uncachedMids = new Set<string>();
      const uncachedPids = new Set<string>();
      for (const m of preciseMembers) {
        for (const p of vibePlaces) {
          if (p.coordinates && !travelCache[m.memberId]?.[p.id]) {
            uncachedMids.add(m.memberId);
            uncachedPids.add(p.id);
          }
        }
      }
      if (uncachedMids.size > 0) {
        const origins = preciseMembers.filter((m) => uncachedMids.has(m.memberId));
        const dests = vibePlaces.filter((p) => p.coordinates && uncachedPids.has(p.id));
        try {
          const matrix = await fetchDistanceMatrix(
            origins.map((m) => m.coordinates),
            dests.map((p) => p.coordinates!),
          );
          for (let i = 0; i < origins.length; i++) {
            const mid = origins[i].memberId;
            if (!travelCache[mid]) travelCache[mid] = {};
            for (let j = 0; j < dests.length; j++) {
              const entry = matrix[i]?.[j];
              if (entry) travelCache[mid][dests[j].id] = entry;
            }
          }
          await setGroupTravelCache(groupId, travelCache);
        } catch {
          // travel enrichment optional
        }
      }
    }

    const results: VibeResult[] = vibePlaces.map((p) => {
      const memberTravel: MemberTravel[] = [];
      for (const m of preciseMembers) {
        const entry = travelCache[m.memberId]?.[p.id];
        if (entry) memberTravel.push({ memberId: m.memberId, ...entry });
      }
      return {
        id: p.id,
        name: p.name,
        type: p.venueType,
        distance: "",
        rating: p.googleRating != null ? p.googleRating.toFixed(1) : "",
        imageUrl: "",
        coordinates: p.coordinates ?? undefined,
        vibeDistance: p.vibeDistance ?? undefined,
        memberTravel: memberTravel.length > 0 ? memberTravel : undefined,
        priceLevel: p.priceLevel ?? undefined,
        address: p.area ?? undefined,
      };
    });

    return res.status(200).json({ data: { results } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Vibe search failed";
    return res.status(500).json({ error: msg });
  }
}
