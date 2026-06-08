'use client';

import { io, Socket } from 'socket.io-client';
import type { Ticker } from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

/** Lazily create the singleton market socket connection (namespace /market). */
export function getMarketSocket(): Socket {
  if (!socket) {
    socket = io(`${WS_URL}/market`, {
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socket;
}

/** Subscribe to the global tickers snapshot. Returns an unsubscribe fn. */
export function onTickers(cb: (tickers: Ticker[]) => void): () => void {
  const s = getMarketSocket();
  s.on('tickers', cb);
  return () => s.off('tickers', cb);
}

/** Subscribe to a single symbol's ticker stream. */
export function onTicker(symbol: string, cb: (t: Ticker) => void): () => void {
  const s = getMarketSocket();
  s.emit('subscribe', [symbol]);
  const handler = (t: Ticker) => {
    if (t.symbol === symbol.toUpperCase()) cb(t);
  };
  s.on('ticker', handler);
  return () => {
    s.emit('unsubscribe', [symbol]);
    s.off('ticker', handler);
  };
}

/* ──────────────────────────────────────────────────────────────
 *  Authenticated per-user channel (/user) — receives live admin
 *  changes & notifications for the logged-in user.
 * ────────────────────────────────────────────────────────────── */
let userSocket: Socket | null = null;

export interface UserEventHandlers {
  onNotification?: (n: unknown) => void;
  onAccountUpdate?: (e: { reason: string }) => void;
  onAccountDeleted?: () => void;
}

/** Connect (or reconnect) the authenticated user socket with a JWT. */
export function connectUserSocket(token: string, handlers: UserEventHandlers): () => void {
  // Tear down any previous connection (e.g. token refresh / re-login).
  if (userSocket) {
    userSocket.disconnect();
    userSocket = null;
  }
  const s = io(`${WS_URL}/user`, {
    transports: ['websocket'],
    withCredentials: true,
    auth: { token },
  });
  userSocket = s;
  if (handlers.onNotification) s.on('notification', handlers.onNotification);
  if (handlers.onAccountUpdate) s.on('account:update', handlers.onAccountUpdate);
  if (handlers.onAccountDeleted) s.on('account:deleted', handlers.onAccountDeleted);

  return () => {
    s.disconnect();
    if (userSocket === s) userSocket = null;
  };
}

export function disconnectUserSocket() {
  if (userSocket) {
    userSocket.disconnect();
    userSocket = null;
  }
}
