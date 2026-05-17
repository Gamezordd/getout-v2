import type { NextApiRequest, NextApiResponse } from "next";
import { joinGroup, getMembers, toPublicMember } from "@/lib/db/members";
import { getOrCreateBrowserId } from "@/lib/cookies";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const groupId = req.query.groupId as string;
  try {
    const browserId = getOrCreateBrowserId(req, res);
    await joinGroup(groupId, browserId);
    const members = await getMembers(groupId);
    res.status(200).json({ members: members.map((m) => toPublicMember(m, browserId)) });
  } catch (err) {
    console.error("POST /api/groups/[groupId]/join", err);
    res.status(500).json({ error: "Failed to join group" });
  }
}
