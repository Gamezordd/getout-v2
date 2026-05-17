import { getSql } from "./client";

let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const sql = getSql();
      await sql`CREATE TABLE IF NOT EXISTS groups_v2 (
        id       TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS group_slugs_v2 (
        slug     TEXT PRIMARY KEY,
        group_id TEXT NOT NULL UNIQUE REFERENCES groups_v2(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS group_members_v2 (
        id         TEXT PRIMARY KEY,
        group_id   TEXT NOT NULL REFERENCES groups_v2(id),
        browser_id TEXT NOT NULL,
        color      TEXT NOT NULL,
        label      TEXT NOT NULL,
        joined_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(group_id, browser_id)
      )`;
    })();
  }
  return ready;
}
