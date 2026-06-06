import { io, Socket } from 'socket.io-client';
import type { Exploration, SecretRealm, ExhibitionMatch, Announcement, Relic } from '../types';

export const SOCKET_EVENTS = {
  EXPLORATION_UPDATE: 'exploration:update',
  SECRET_REALM_UPDATE: 'secret_realm:update',
  EXHIBITION_UPDATE: 'exhibition:update',
  ANNOUNCEMENT: 'announcement',
  RELIC_FOUND: 'relic:found'
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

type EventCallbackMap = {
  [SOCKET_EVENTS.EXPLORATION_UPDATE]: (data: Exploration) => void;
  [SOCKET_EVENTS.SECRET_REALM_UPDATE]: (data: SecretRealm) => void;
  [SOCKET_EVENTS.EXHIBITION_UPDATE]: (data: ExhibitionMatch) => void;
  [SOCKET_EVENTS.ANNOUNCEMENT]: (data: Announcement) => void;
  [SOCKET_EVENTS.RELIC_FOUND]: (data: Relic) => void;
};

const SOCKET_URL = 'ws://localhost:3001';

let socket: Socket | null = null;

export function initSocket(token: string): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('[Socket] 已连接');
  });

  socket.on('disconnect', () => {
    console.log('[Socket] 已断开');
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] 连接错误:', error.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function onExplorationUpdate(cb: EventCallbackMap[typeof SOCKET_EVENTS.EXPLORATION_UPDATE]): () => void {
  if (!socket) return () => {};
  socket.on(SOCKET_EVENTS.EXPLORATION_UPDATE, cb);
  return () => socket?.off(SOCKET_EVENTS.EXPLORATION_UPDATE, cb);
}

export function onSecretRealmUpdate(cb: EventCallbackMap[typeof SOCKET_EVENTS.SECRET_REALM_UPDATE]): () => void {
  if (!socket) return () => {};
  socket.on(SOCKET_EVENTS.SECRET_REALM_UPDATE, cb);
  return () => socket?.off(SOCKET_EVENTS.SECRET_REALM_UPDATE, cb);
}

export function onExhibitionUpdate(cb: EventCallbackMap[typeof SOCKET_EVENTS.EXHIBITION_UPDATE]): () => void {
  if (!socket) return () => {};
  socket.on(SOCKET_EVENTS.EXHIBITION_UPDATE, cb);
  return () => socket?.off(SOCKET_EVENTS.EXHIBITION_UPDATE, cb);
}

export function onAnnouncement(cb: EventCallbackMap[typeof SOCKET_EVENTS.ANNOUNCEMENT]): () => void {
  if (!socket) return () => {};
  socket.on(SOCKET_EVENTS.ANNOUNCEMENT, cb);
  return () => socket?.off(SOCKET_EVENTS.ANNOUNCEMENT, cb);
}

export function onRelicFound(cb: EventCallbackMap[typeof SOCKET_EVENTS.RELIC_FOUND]): () => void {
  if (!socket) return () => {};
  socket.on(SOCKET_EVENTS.RELIC_FOUND, cb);
  return () => socket?.off(SOCKET_EVENTS.RELIC_FOUND, cb);
}
