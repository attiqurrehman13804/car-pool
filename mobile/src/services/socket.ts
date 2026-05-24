import { io, Socket } from 'socket.io-client';
import { env } from '../config/env';
import { DriverLocation } from '../types';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(env.socketUrl, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
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

export function joinPodRoom(podId: string): void {
  socket?.emit('pod:join', { podId });
}

export function leavePodRoom(podId: string): void {
  socket?.emit('pod:leave', { podId });
}

export function emitGpsUpdate(
  podId: string,
  lat: number,
  lng: number,
  heading = 0,
  speed = 0,
): void {
  socket?.emit('gps:update', { podId, lat, lng, heading, speed });
}

export function onDriverLocation(callback: (location: DriverLocation & { podId: string }) => void): () => void {
  const handler = (data: DriverLocation & { podId: string }) => callback(data);
  socket?.on('driver:location', handler);
  return () => {
    socket?.off('driver:location', handler);
  };
}

export function onSosAlert(callback: (data: { rideId: string; userId: string; timestamp: string }) => void): () => void {
  const handler = (data: { rideId: string; userId: string; timestamp: string }) => callback(data);
  socket?.on('sos:alert', handler);
  return () => {
    socket?.off('sos:alert', handler);
  };
}
