import { getSql } from "./client";
import { ensureSchema } from "./schema";
import { generateRandomSlug } from "@/lib/wordList";

type SlugRow = { slug: string };
type GroupIdRow = { group_id: string };

export async function createSlugForGroup(groupId: string): Promise<string> {
  await ensureSchema();
  const sql = getSql();
  for (let i = 0; i < 10; i++) {
    const slug = generateRandomSlug();
    try {
      await sql`INSERT INTO group_slugs_v2 (slug, group_id) VALUES (${slug}, ${groupId}) ON CONFLICT DO NOTHING`;
      const rows = await sql`SELECT slug FROM group_slugs_v2 WHERE group_id = ${groupId} LIMIT 1` as SlugRow[];
      if (rows[0]) return rows[0].slug;
    } catch { /* collision — retry */ }
  }
  throw new Error("Unable to allocate a group slug");
}

export async function findGroupBySlug(slug: string): Promise<string | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT group_id FROM group_slugs_v2 WHERE slug = ${slug} LIMIT 1` as GroupIdRow[];
  return rows[0]?.group_id ?? null;
}
