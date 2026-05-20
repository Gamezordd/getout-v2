import type { NextApiRequest, NextApiResponse } from "next";
import { fetchDistanceMatrix } from "@/lib/travel/distanceMatrix";
import type { Coordinates } from "@/types/location";
import type { TravelEntry } from "@/types/travel";

type RequestBody = {
  origins?: Coordinates[];
  destinations?: Coordinates[];
};

function isCoordinates(v: unknown): v is Coordinates {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Coordinates).lat === "number" &&
    typeof (v as Coordinates).lng === "number"
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const groupId = req.query.groupId;
  if (typeof groupId !== "string") {
    return res.status(400).json({ error: "Invalid group id" });
  }

  const { origins, destinations } = (req.body ?? {}) as RequestBody;

  if (!Array.isArray(origins) || !origins.every(isCoordinates)) {
    return res.status(400).json({ error: "origins must be an array of {lat, lng}" });
  }
  if (!Array.isArray(destinations) || !destinations.every(isCoordinates)) {
    return res.status(400).json({ error: "destinations must be an array of {lat, lng}" });
  }
  if (origins.length === 0 || destinations.length === 0) {
    return res.status(200).json({ data: { matrix: [] } });
  }

  try {
    const matrix: (TravelEntry | null)[][] = await fetchDistanceMatrix(origins, destinations);
    return res.status(200).json({ data: { matrix } });
  } catch (error) {
    console.error("travel handler", error);
    return res.status(500).json({ error: "Failed to compute distance matrix" });
  }
}
