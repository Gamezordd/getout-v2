import { getSql } from "./client";
import type { Coordinates } from "@/types/location";

type RawSql = { query: (q: string, args?: unknown[]) => Promise<unknown> };

export type VibePlace = {
  id: string;
  name: string;
  venueType: string;
  address: string | null;
  area: string | null;
  coordinates: Coordinates | null;
  googleRating: number | null;
  vibeDistance: number | null;
  priceLevel: number | null;
};

type DeepRow = {
  place_id: string;
  place_name: string;
  venue_type: string | null;
  address: string | null;
  area: string | null;
  coordinates_json: Coordinates | null;
  google_rating: number | null;
  vector_distance: number | null;
  price_feel: number | null;
};

type CacheRow = {
  expanded_query: string;
  semantic_vector: string | null;
};

const CATEGORY_VENUE_TYPES: Record<string, string[]> = {
  coffee:  ["cafe", "brunch", "bakery", "dessert"],
  alcohol: ["bar", "pub", "lounge", "club", "brewery"],
  food:    ["restaurant", "fast_food", "fine_dining", "brunch", "bakery", "dessert"],
};

const toPgVector = (vector: number[]) =>
  `[${vector.map((v) => v.toFixed(8)).join(",")}]`;

const parseVector = (raw: string | null): number[] | null => {
  if (!raw) return null;
  const values = raw.trim().replace(/^\[|\]$/g, "").split(",").map(Number);
  return values.some((v) => !Number.isFinite(v)) ? null : values;
};

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql() as unknown as RawSql;
      await sql.query("CREATE EXTENSION IF NOT EXISTS vector");
      await sql.query(`
        CREATE TABLE IF NOT EXISTS place_deep_query_cache (
          normalized_query TEXT NOT NULL,
          category         TEXT NOT NULL,
          expanded_query   TEXT NOT NULL,
          semantic_vector  HALFVEC(3072),
          embedding_model  TEXT NOT NULL,
          llm_model        TEXT NOT NULL,
          created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (normalized_query, category)
        )
      `);
      // Ensure the vector column is the right dimension. Safe to drop+recreate — it's a cache table.
      await sql.query(`ALTER TABLE place_deep_query_cache DROP COLUMN IF EXISTS semantic_vector`);
      await sql.query(`ALTER TABLE place_deep_query_cache ADD COLUMN IF NOT EXISTS semantic_vector HALFVEC(3072)`);
    })();
  }
  return schemaReady;
}

export const getCachedDeepQuery = async (
  normalizedQuery: string,
  category: string,
): Promise<{ expandedQuery: string; semanticVector: number[] } | null> => {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT expanded_query, semantic_vector::text AS semantic_vector
    FROM place_deep_query_cache
    WHERE normalized_query = ${normalizedQuery}
      AND category = ${category}
    LIMIT 1
  `) as CacheRow[];
  if (!rows[0]) return null;
  const vector = parseVector(rows[0].semantic_vector);
  if (!vector) return null;
  return { expandedQuery: rows[0].expanded_query, semanticVector: vector };
};

export const upsertDeepQueryCache = async (params: {
  normalizedQuery: string;
  category: string;
  expandedQuery: string;
  semanticVector: number[];
  embeddingModel: string;
  llmModel: string;
}) => {
  await ensureSchema();
  const sql = getSql() as unknown as RawSql;
  await sql.query(
    `
    INSERT INTO place_deep_query_cache
      (normalized_query, category, expanded_query, semantic_vector, embedding_model, llm_model, updated_at)
    VALUES ($1, $2, $3, $4::halfvec(3072), $5, $6, NOW())
    ON CONFLICT (normalized_query, category) DO UPDATE SET
      expanded_query  = EXCLUDED.expanded_query,
      semantic_vector = EXCLUDED.semantic_vector,
      embedding_model = EXCLUDED.embedding_model,
      llm_model       = EXCLUDED.llm_model,
      updated_at      = NOW()
    `,
    [
      params.normalizedQuery,
      params.category,
      params.expandedQuery,
      toPgVector(params.semanticVector),  // cast as halfvec(3072) in SQL
      params.embeddingModel,
      params.llmModel,
    ],
  );
};

export const searchPlacesBySemantic = async (params: {
  cityKey: string | null;
  category: string;
  semanticVector: number[];
  limit?: number;
}): Promise<VibePlace[]> => {
  await ensureSchema();
  const sql = getSql() as unknown as RawSql;
  const venueTypes = CATEGORY_VENUE_TYPES[params.category] ?? [params.category];
  const vectorLiteral = toPgVector(params.semanticVector);
  const limit = params.limit ?? 8;

  const rows = params.cityKey
    ? (await sql.query(
        `
        SELECT place_id, place_name, venue_type, address, area, coordinates_json, google_rating,
          (profile_json->>'price_feel')::float AS price_feel,
          COALESCE(semantic_description_vector_large, semantic_vector_large) <=> $1::halfvec(3072) AS vector_distance
        FROM place_deep_profiles
        WHERE city_key = $2 AND venue_type = ANY($3::text[])
        ORDER BY COALESCE(semantic_description_vector_large, semantic_vector_large) <=> $1::halfvec(3072)
        LIMIT $4
        `,
        [vectorLiteral, params.cityKey, venueTypes, limit],
      ) as DeepRow[])
    : (await sql.query(
        `
        SELECT place_id, place_name, venue_type, address, area, coordinates_json, google_rating,
          (profile_json->>'price_feel')::float AS price_feel,
          COALESCE(semantic_description_vector_large, semantic_vector_large) <=> $1::halfvec(3072) AS vector_distance
        FROM place_deep_profiles
        WHERE venue_type = ANY($2::text[])
        ORDER BY COALESCE(semantic_description_vector_large, semantic_vector_large) <=> $1::halfvec(3072)
        LIMIT $3
        `,
        [vectorLiteral, venueTypes, limit],
      ) as DeepRow[]);

  return rows
    .filter((r) => r.coordinates_json && r.place_id)
    .map((r) => {
      const pf = typeof r.price_feel === "number" ? r.price_feel : parseFloat(String(r.price_feel ?? ""));
      const priceLevel = Number.isFinite(pf) ? (pf <= 0.25 ? 1 : pf <= 0.5 ? 2 : pf <= 0.75 ? 3 : 4) : null;
      return {
        id: r.place_id,
        name: r.place_name,
        venueType: r.venue_type ?? "",
        address: r.address,
        area: r.area,
        coordinates: r.coordinates_json,
        googleRating: r.google_rating,
        vibeDistance: typeof r.vector_distance === "number" ? Number(r.vector_distance.toFixed(4)) : null,
        priceLevel,
      };
    });
};
