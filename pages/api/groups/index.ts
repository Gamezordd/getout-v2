import type { NextApiRequest, NextApiResponse } from "next";
import { createGroup } from "@/lib/db/groups";
import type { Category } from "@/types/group";
import { createSlugForGroup } from "@/lib/db/slugs";
import { joinGroup } from "@/lib/db/members";
import { getOrCreateBrowserId } from "@/lib/cookies";

const VALID_CATEGORIES: Category[] = ["coffee", "alcohol", "food"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { category } = req.body as { category: unknown };
  if (!VALID_CATEGORIES.includes(category as Category)) {
    return res.status(400).json({ error: "Invalid category" });
  }
  try {
    const browserId = getOrCreateBrowserId(req, res);
    const group = await createGroup(category as Category);
    const slug = await createSlugForGroup(group.id);
    await joinGroup(group.id, browserId);
    res.status(200).json({ slug, groupId: group.id });
  } catch (err) {
    console.error("POST /api/groups", err);
    res.status(500).json({ error: "Failed to create group" });
  }
}
