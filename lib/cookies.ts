import { serialize, parse } from "cookie";
import { randomUUID } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";

const BROWSER_ID_COOKIE = "getout_v2_browser_id";

export function getBrowserIdFromCookie(req: IncomingMessage): string | null {
  const cookies = parse(req.headers.cookie ?? "");
  return cookies[BROWSER_ID_COOKIE] ?? null;
}

export function setBrowserIdCookie(res: ServerResponse, browserId: string): void {
  res.setHeader(
    "Set-Cookie",
    serialize(BROWSER_ID_COOKIE, browserId, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    }),
  );
}

export function getOrCreateBrowserId(req: IncomingMessage, res: ServerResponse): string {
  const existing = getBrowserIdFromCookie(req);
  if (existing) return existing;
  const id = randomUUID();
  setBrowserIdCookie(res, id);
  return id;
}
