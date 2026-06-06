import { Server as HttpServer } from 'http';
import { Server, ServerOptions, Socket } from 'socket.io';
import { config } from '../config';

export const SocketEvents = {
  EXPLORATION_UPDATE: 'exploration:update',
  SECRET_REALM_UPDATE: 'secret_realm:update',
  EXHIBITION_UPDATE: 'exhibition:update',
  ANNOUNCEMENT: 'announcement',
  RELIC_FOUND: 'relic:found',
  PLAYER_CONNECT: 'player:connect',
  PLAYER_DISCONNECT: 'player:disconnect',
  ERROR: 'error',
} as const;

export type SocketEventType = typeof SocketEvents[keyof typeof SocketEvents];

let io: Server | null = null;

export interface SocketAuthPayload {
  userId: string;
}

export function initIO(httpServer: HttpServer): Server {
  if (io) {
    return io;
  }

  const ioOptions: Partial<ServerOptions> = {
    cors: {
      origin: config.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  };

  io = new Server(httpServer, ioOptions);

  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;

    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket] 用户 ${userId} 已连接，Socket ID: ${socket.id}`);

      socket.emit(SocketEvents.PLAYER_CONNECT, {
        userId,
        timestamp: Date.now(),
      });
    }

    socket.on('disconnect', () => {
      console.log(`[Socket] 用户 ${userId || '未知'} 已断开连接`);
      if (userId) {
        io?.emit(SocketEvents.PLAYER_DISCONNECT, {
          userId,
          timestamp: Date.now(),
        });
      }
    });

    socket.on('error', (error) => {
      console.error(`[Socket] Socket ${socket.id} 错误:`, error);
    });
  });

  console.log('[Socket] Socket.io 已初始化');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io 尚未初始化。请先调用 initIO()');
  }
  return io;
}

export function emitToUser(userId: string, event: string, data?: unknown): void {
  const socketIO = getIO();
  socketIO.to(`user:${userId}`).emit(event, data);
}

export function broadcast(event: string, data?: unknown): void {
  const socketIO = getIO();
  socketIO.emit(event, data);
}

export function emitToRoom(room: string, event: string, data?: unknown): void {
  const socketIO = getIO();
  socketIO.to(room).emit(event, data);
}
