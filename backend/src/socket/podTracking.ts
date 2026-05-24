import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { pool } from '../db/pool';
import { JwtPayload } from '../types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

function authenticateSocket(socket: AuthenticatedSocket): boolean {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return false;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (payload.type !== 'full') {
      return false;
    }
    socket.userId = payload.userId;
    socket.email = payload.email;
    return true;
  } catch {
    return false;
  }
}

export function setupPodTracking(io: Server): void {
  io.use((socket: AuthenticatedSocket, next) => {
    if (authenticateSocket(socket)) {
      next();
    } else {
      next(new Error('Authentication required'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Socket connected: ${socket.email}`);

    socket.on('pod:join', async ({ podId }: { podId: string }) => {
      try {
        const membership = await pool.query(
          `SELECT 1 FROM pod_members WHERE pod_id = $1 AND user_id = $2`,
          [podId, socket.userId],
        );

        if (membership.rows.length === 0) {
          socket.emit('error', { message: 'Not a member of this pod' });
          return;
        }

        socket.join(`pod:${podId}`);
        socket.emit('pod:joined', { podId });
      } catch (error) {
        console.error('pod:join error:', error);
        socket.emit('error', { message: 'Failed to join pod room' });
      }
    });

    socket.on('pod:leave', ({ podId }: { podId: string }) => {
      socket.leave(`pod:${podId}`);
      socket.emit('pod:left', { podId });
    });

    socket.on(
      'gps:update',
      async (data: { podId: string; lat: number; lng: number; heading?: number; speed?: number }) => {
        try {
          const { podId, lat, lng, heading, speed } = data;

          const driverCheck = await pool.query(
            `SELECT 1 FROM pod_members
             WHERE pod_id = $1 AND user_id = $2 AND role = 'driver'`,
            [podId, socket.userId],
          );

          if (driverCheck.rows.length === 0) {
            socket.emit('error', { message: 'Only drivers can broadcast GPS' });
            return;
          }

          io.to(`pod:${podId}`).emit('driver:location', {
            podId,
            lat,
            lng,
            heading: heading ?? 0,
            speed: speed ?? 0,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('gps:update error:', error);
        }
      },
    );

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.email}`);
    });
  });
}
