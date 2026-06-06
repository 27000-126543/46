import { useEffect, useCallback, useRef } from 'react';
import {
  initSocket,
  disconnectSocket,
  getSocket,
  SOCKET_EVENTS,
  type SocketEvent
} from '../lib/socket';
import type { Exploration, SecretRealm, ExhibitionMatch, Announcement, Relic } from '../types';

type EventDataMap = {
  [SOCKET_EVENTS.EXPLORATION_UPDATE]: Exploration;
  [SOCKET_EVENTS.SECRET_REALM_UPDATE]: SecretRealm;
  [SOCKET_EVENTS.EXHIBITION_UPDATE]: ExhibitionMatch;
  [SOCKET_EVENTS.ANNOUNCEMENT]: Announcement;
  [SOCKET_EVENTS.RELIC_FOUND]: Relic;
};

type EventCallback<T extends SocketEvent> = (data: EventDataMap[T]) => void;

interface UseSocketReturn {
  subscribe: <T extends SocketEvent>(event: T, callback: EventCallback<T>) => void;
  unsubscribe: <T extends SocketEvent>(event: T) => void;
}

export function useSocket(): UseSocketReturn {
  const callbacksRef = useRef<Map<SocketEvent, EventCallback<SocketEvent>>>(new Map());

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const socket = initSocket(token);

      callbacksRef.current.forEach((callback, event) => {
        socket.on(event as string, callback as (...args: any[]) => void);
      });
    }

    return () => {
      const socket = getSocket();
      if (socket) {
        callbacksRef.current.forEach((_callback, event) => {
          socket.off(event);
        });
      }
      disconnectSocket();
    };
  }, []);

  const subscribe = useCallback(<T extends SocketEvent>(event: T, callback: EventCallback<T>) => {
    callbacksRef.current.set(event, callback as EventCallback<SocketEvent>);
    const socket = getSocket();
    if (socket) {
      socket.on(event as string, callback as (...args: any[]) => void);
    }
  }, []);

  const unsubscribe = useCallback(<T extends SocketEvent>(event: T) => {
    callbacksRef.current.delete(event);
    const socket = getSocket();
    if (socket) {
      socket.off(event);
    }
  }, []);

  return { subscribe, unsubscribe };
}

export default useSocket;
