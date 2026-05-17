import type { NextApiRequest, NextApiResponse } from "next";
import { findGroupBySlug } from "@/lib/db/slugs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const slug = req.query.slug as string;
  if (!slug) return res.status(400).json({ error: "Missing slug" });
  try {
    const groupId = await findGroupBySlug(slug);
    if (!groupId) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ groupId });
  } catch (err) {
    console.error("GET /api/slugs/resolve", err);
    res.status(500).json({ error: "Server error" });
  }
}
