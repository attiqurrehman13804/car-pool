import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { pool } from '../db/pool';
import { JwtPayload } from '../types';
import { createNotification } from '../services/notification.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

function authenticateSocket(socket: AuthenticatedSocket): boolean {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return false;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (payload.type !== 'full') return false;
    socket.userId = payload.userId;
    socket.email = payload.email;
    return true;
  } catch {
    return false;
  }
}

async function checkGeofenceArrival(
  io: Server,
  podId: string,
  driverLat: number,
  driverLng: number,
): Promise<void> {
  const passengers = await pool.query(
    `SELECT pm.user_id, ST_Y(pm.pickup_point::geometry) AS lat, ST_X(pm.pickup_point::geometry) AS lng
     FROM pod_members pm WHERE pm.pod_id = $1 AND pm.role = 'passenger' AND pm.member_status = 'confirmed'`,
    [podId],
  );

  for (const p of passengers.rows) {
    if (!p.lat || !p.lng) continue;
    const result = await pool.query<{ within: boolean }>(
      `SELECT ST_DWithin(
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
         ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
         $5) AS within`,
      [driverLng, driverLat, p.lng, p.lat, config.geofenceArrivalMeters],
    );
    if (result.rows[0]?.within) {
      io.to(`pod:${podId}`).emit('geofence:arrival', {
        podId,
        userId: p.user_id,
        lat: driverLat,
        lng: driverLng,
      });
      await createNotification(
        p.user_id,
        'arrival',
        'Driver Arriving',
        'Your driver is within 200m of your pickup point.',
        { podId, lat: driverLat, lng: driverLng },
      );
    }
  }
}

export function setupPodTracking(io: Server): void {
  io.use((socket: AuthenticatedSocket, next) => {
    if (authenticateSocket(socket)) next();
    else next(new Error('Authentication required'));
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
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
      } catch {
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
            `SELECT 1 FROM pod_members WHERE pod_id = $1 AND user_id = $2 AND role = 'driver'`,
            [podId, socket.userId],
          );
          if (driverCheck.rows.length === 0) {
            socket.emit('error', { message: 'Only drivers can broadcast GPS' });
            return;
          }
          io.to(`pod:${podId}`).emit('driver:location', {
            podId, lat, lng,
            heading: heading ?? 0,
            speed: speed ?? 0,
            timestamp: new Date().toISOString(),
          });
          await checkGeofenceArrival(io, podId, lat, lng);
        } catch (error) {
          console.error('gps:update error:', error);
        }
      },
    );

    socket.on('chat:message', async (data: { podId: string; content: string }) => {
      try {
        const { podId, content } = data;
        if (!content?.trim()) return;
        const membership = await pool.query(
          `SELECT 1 FROM pod_members WHERE pod_id = $1 AND user_id = $2`,
          [podId, socket.userId],
        );
        if (membership.rows.length === 0) return;

        const result = await pool.query(
          `INSERT INTO messages (pod_id, sender_id, content) VALUES ($1, $2, $3)
           RETURNING id, created_at`,
          [podId, socket.userId, content.trim()],
        );
        const user = await pool.query(`SELECT email, full_name FROM users WHERE id = $1`, [socket.userId]);
        io.to(`pod:${podId}`).emit('chat:message', {
          id: result.rows[0].id,
          podId,
          senderId: socket.userId,
          senderEmail: user.rows[0]?.email,
          senderName: user.rows[0]?.full_name,
          content: content.trim(),
          createdAt: result.rows[0].created_at,
        });
      } catch (error) {
        console.error('chat:message error:', error);
      }
    });

    socket.on('ride:status', async (data: { podId: string; status: string }) => {
      io.to(`pod:${data.podId}`).emit('ride:status', {
        podId: data.podId,
        status: data.status,
        timestamp: new Date().toISOString(),
      });
    });
  });
}
