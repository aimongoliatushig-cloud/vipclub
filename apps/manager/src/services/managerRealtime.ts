import { io, type Socket } from "socket.io-client";

type ManagerRealtimeHandlers = {
  onGuestChanged?: () => void;
  onReadinessChanged?: () => void;
  onReconnect?: () => void;
};

let socket: Socket | null = null;
let subscriberCount = 0;
let hasConnected = false;
const guestHandlers = new Set<() => void>();
const readinessHandlers = new Set<() => void>();
const reconnectHandlers = new Set<() => void>();

function ensureSocket() {
  if (socket) return;
  socket = io(window.location.origin, {
    path: "/socket.io",
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    timeout: 10_000,
  });
  socket.on("connect", () => {
    if (hasConnected) reconnectHandlers.forEach((handler) => handler());
    hasConnected = true;
  });
  socket.on("vip_customer_entry", () =>
    guestHandlers.forEach((handler) => handler()),
  );
  socket.on("vip_phone_reservation", () =>
    guestHandlers.forEach((handler) => handler()),
  );
  socket.on("vip_readiness_pending", () =>
    readinessHandlers.forEach((handler) => handler()),
  );
}

export function connectManagerRealtime({
  onGuestChanged,
  onReadinessChanged,
  onReconnect,
}: ManagerRealtimeHandlers): () => void {
  if (onGuestChanged) guestHandlers.add(onGuestChanged);
  if (onReadinessChanged) readinessHandlers.add(onReadinessChanged);
  if (onReconnect) reconnectHandlers.add(onReconnect);
  subscriberCount += 1;
  ensureSocket();

  return () => {
    if (onGuestChanged) guestHandlers.delete(onGuestChanged);
    if (onReadinessChanged) readinessHandlers.delete(onReadinessChanged);
    if (onReconnect) reconnectHandlers.delete(onReconnect);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0 && socket) {
      socket.disconnect();
      socket = null;
      hasConnected = false;
    }
  };
}
