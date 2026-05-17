import { getSql } from "./client";
import { ensureSchema } from "./schema";
import { randomUUID } from "crypto";
import type { Category } from "@/types/group";

export type GroupRow = { id: string; category: Category };

type GroupDbRow = { id: string; category: string };

export async function createGroup(category: Category): Promise<GroupRow> {
  await ensureSchema();
  const sql = getSql();
  const id = randomUUID();
  await sql`INSERT INTO groups_v2 (id, category) VALUES (${id}, ${category})`;
  return { id, category };
}

export async function getGroup(groupId: string): Promise<GroupRow | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT id, category FROM groups_v2 WHERE id = ${groupId} LIMIT 1` as GroupDbRow[];
  if (!rows[0]) return null;
  return { id: rows[0].id, category: rows[0].category as Category };
}
