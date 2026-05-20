import PusherJs from "pusher-js";

let instance: PusherJs | null = null;

export function getPusherClient(): PusherJs {
  if (instance) return instance;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    throw new Error("Pusher client credentials are missing");
  }

  instance = new PusherJs(key, { cluster });
  return instance;
}
