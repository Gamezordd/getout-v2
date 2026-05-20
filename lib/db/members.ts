import { getSql } from "./client";
import { ensureSchema } from "./schema";
import { randomUUID } from "crypto";

const MEMBER_COLORS = ["#7c5cbf", "#3d8ef5", "#e05c8a", "#e07f2b", "#4caf8a"];

export type MemberRow = { id: string; groupId: string; browserId: string; color: string; label: string };
export type MemberPublic = { id: string; color: string; label: string; isMe: boolean };

type MemberDbRow = { id: string; group_id: string; browser_id: string; color: string; label: string };

function toRow(r: MemberDbRow): MemberRow {
  return { id: r.id, groupId: r.group_id, browserId: r.browser_id, color: r.color, label: r.label };
}

export async function joinGroup(groupId: string, browserId: string): Promise<MemberRow> {
  await ensureSchema();
  const sql = getSql();

  const existing = await sql`
    SELECT id, group_id, browser_id, color, label FROM group_members_v2
    WHERE group_id = ${groupId} AND browser_id = ${browserId} LIMIT 1
  ` as MemberDbRow[];
  if (existing[0]) return toRow(existing[0]);

  const countRows = await sql`SELECT COUNT(*)::int AS count FROM group_members_v2 WHERE group_id = ${groupId}` as Array<{ count: number }>;
  const index = countRows[0].count;
  const label = String.fromCharCode(65 + (index % 26));
  const color = MEMBER_COLORS[index % MEMBER_COLORS.length];
  const id = randomUUID();

  await sql`
    INSERT INTO group_members_v2 (id, group_id, browser_id, color, label)
    VALUES (${id}, ${groupId}, ${browserId}, ${color}, ${label})
    ON CONFLICT (group_id, browser_id) DO NOTHING
  `;

  const rows = await sql`
    SELECT id, group_id, browser_id, color, label FROM group_members_v2
    WHERE group_id = ${groupId} AND browser_id = ${browserId} LIMIT 1
  ` as MemberDbRow[];
  return toRow(rows[0]);
}

export async function getMembers(groupId: string): Promise<MemberRow[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, group_id, browser_id, color, label FROM group_members_v2
    WHERE group_id = ${groupId} ORDER BY joined_at ASC
  ` as MemberDbRow[];
  return rows.map(toRow);
}

export async function getMemberByBrowserId(
  groupId: string,
  browserId: string,
): Promise<MemberRow | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, group_id, browser_id, color, label FROM group_members_v2
    WHERE group_id = ${groupId} AND browser_id = ${browserId} LIMIT 1
  ` as MemberDbRow[];
  return rows[0] ? toRow(rows[0]) : null;
}

export function toPublicMember(member: MemberRow, currentBrowserId: string): MemberPublic {
  return { id: member.id, color: member.color, label: member.label, isMe: member.browserId === currentBrowserId };
}
