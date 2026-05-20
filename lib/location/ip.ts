import type { NextApiRequest } from "next";
import type { Coordinates } from "@/types/location";

export type ApproximateLocation = {
  coordinates: Coordinates;
  label: string | null;
  city: string | null;
};

type IpApiCoResponse = {
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
};

type IpApiResponse = {
  status?: string;
  city?: string;
  regionName?: string;
  lat?: number;
  lon?: number;
};

function toNumber(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getHeaderValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

function buildLabel(city: string | null, region: string | null): string | null {
  const parts = [city, region].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function normalizeIp(value: string): string {
  return value.replace("::ffff:", "").trim();
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function getCandidateIps(req: NextApiRequest): string[] {
  const candidates: string[] = [];
  const forwardedFor = getHeaderValue(req.headers["x-forwarded-for"]);
  const realIp = getHeaderValue(req.headers["x-real-ip"]);
  const remoteAddress = req.socket.remoteAddress
    ? normalizeIp(req.socket.remoteAddress)
    : null;

  if (forwardedFor) {
    candidates.push(
      ...forwardedFor
        .split(",")
        .map((value) => normalizeIp(value))
        .filter(Boolean),
    );
  }

  if (realIp) {
    candidates.push(normalizeIp(realIp));
  }

  if (remoteAddress) {
    candidates.push(remoteAddress);
  }

  return Array.from(new Set(candidates));
}

export function getApproximateLocationDebug(req: NextApiRequest): {
  candidateIps: string[];
  publicIp: string | null;
} {
  const candidateIps = getCandidateIps(req);
  return {
    candidateIps,
    publicIp: candidateIps.find((ip) => !isPrivateIp(ip)) ?? null,
  };
}

function getPublicIp(req: NextApiRequest): string | null {
  return getCandidateIps(req).find((ip) => !isPrivateIp(ip)) ?? null;
}

function getVercelLocation(req: NextApiRequest): ApproximateLocation | null {
  const lat = toNumber(req.headers["x-vercel-ip-latitude"]);
  const lng = toNumber(req.headers["x-vercel-ip-longitude"]);
  if (lat === null || lng === null) return null;

  const city = getHeaderValue(req.headers["x-vercel-ip-city"]);
  const region =
    getHeaderValue(req.headers["x-vercel-ip-country-region"]) ??
    getHeaderValue(req.headers["x-vercel-ip-country"]);

  return {
    coordinates: { lat, lng },
    label: buildLabel(city, region),
    city,
  };
}

async function lookupWithIpApiCo(ip: string): Promise<ApproximateLocation | null> {
  const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (!response.ok) return null;

  const payload = (await response.json()) as IpApiCoResponse;
  if (
    typeof payload.latitude !== "number" ||
    typeof payload.longitude !== "number"
  ) {
    return null;
  }

  return {
    coordinates: { lat: payload.latitude, lng: payload.longitude },
    label: buildLabel(payload.city ?? null, payload.region ?? null),
    city: payload.city ?? null,
  };
}

async function lookupWithIpApi(ip: string): Promise<ApproximateLocation | null> {
  const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as IpApiResponse;
  if (
    payload.status !== "success" ||
    typeof payload.lat !== "number" ||
    typeof payload.lon !== "number"
  ) {
    return null;
  }

  return {
    coordinates: { lat: payload.lat, lng: payload.lon },
    label: buildLabel(payload.city ?? null, payload.regionName ?? null),
    city: payload.city ?? null,
  };
}

async function lookupIpLocation(ip: string): Promise<ApproximateLocation | null> {
  try {
    const primary = await lookupWithIpApiCo(ip);
    if (primary) return primary;
  } catch {}

  try {
    const fallback = await lookupWithIpApi(ip);
    if (fallback) return fallback;
  } catch {}

  return null;
}

export async function resolveApproximateLocation(
  req: NextApiRequest,
): Promise<ApproximateLocation | null> {
  const vercelLocation = getVercelLocation(req);
  if (vercelLocation) return vercelLocation;

  const ip = getPublicIp(req);
  if (!ip) return null;

  return lookupIpLocation(ip);
}
