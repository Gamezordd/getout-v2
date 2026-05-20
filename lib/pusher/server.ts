import Pusher from "pusher";
import { groupChannel, EVENTS } from "./events";

let instance: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (instance) return instance;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    throw new Error("Pusher server credentials are missing");
  }

  instance = new Pusher({ appId, key, secret, cluster });
  return instance;
}

export async function broadcastPinsUpdated(groupId: string): Promise<void> {
  const pusher = getPusherServer();
  await pusher.trigger(groupChannel(groupId), EVENTS.PINS_UPDATED, {});
}

export async function broadcastGroupEvent(
  groupId: string,
  event: string,
  data: unknown,
): Promise<void> {
  const pusher = getPusherServer();
  await pusher.trigger(groupChannel(groupId), event, data);
}
