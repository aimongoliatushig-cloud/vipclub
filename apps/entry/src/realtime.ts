import { io, type Socket } from "socket.io-client";

type RealtimePayload = Record<string, unknown>;
type RealtimeHandler = (payload: RealtimePayload) => void;

let socket: Socket | null = null;
let subscriptionCount = 0;

function getSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
    });
  }
  return socket;
}

export function subscribeRealtime(event: string, handler: RealtimeHandler) {
  // The Vite-only visual QA page has no Frappe websocket service. Production
  // uses the authenticated same-origin /socket.io gateway.
  if (import.meta.env.DEV) return () => {};

  const activeSocket = getSocket();
  subscriptionCount += 1;
  activeSocket.on(event, handler);
  if (!activeSocket.connected) activeSocket.connect();

  return () => {
    activeSocket.off(event, handler);
    subscriptionCount = Math.max(0, subscriptionCount - 1);
    if (!subscriptionCount) activeSocket.disconnect();
  };
}
