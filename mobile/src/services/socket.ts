import { io, Socket } from 'socket.io-client';
import { env } from '../config/env';
import { ChatMessage, DriverLocation } from '../types';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  socket = io(env.socketUrl, { auth: { token }, transports: ['websocket'], autoConnect: true });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
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

export function emitGpsUpdate(podId: string, lat: number, lng: number, heading = 0, speed = 0): void {
  socket?.emit('gps:update', { podId, lat, lng, heading, speed });
}

export function sendChatMessage(podId: string, content: string): void {
  socket?.emit('chat:message', { podId, content });
}

export function onDriverLocation(callback: (location: DriverLocation & { podId: string }) => void): () => void {
  const handler = (data: DriverLocation & { podId: string }) => callback(data);
  socket?.on('driver:location', handler);
  return () => socket?.off('driver:location', handler);
}

export function onSosAlert(callback: (data: { rideId: string; userId: string; lat?: number; lng?: number; timestamp: string }) => void): () => void {
  const handler = (data: { rideId: string; userId: string; lat?: number; lng?: number; timestamp: string }) => callback(data);
  socket?.on('sos:alert', handler);
  return () => socket?.off('sos:alert', handler);
}

export function onChatMessage(callback: (msg: ChatMessage) => void): () => void {
  const handler = (data: ChatMessage) => callback(data);
  socket?.on('chat:message', handler);
  return () => socket?.off('chat:message', handler);
}

export function onGeofenceArrival(callback: (data: { podId: string; userId: string; lat: number; lng: number }) => void): () => void {
  const handler = (data: { podId: string; userId: string; lat: number; lng: number }) => callback(data);
  socket?.on('geofence:arrival', handler);
  return () => socket?.off('geofence:arrival', handler);
}

export function onRideStatus(callback: (data: { podId: string; status: string }) => void): () => void {
  const handler = (data: { podId: string; status: string }) => callback(data);
  socket?.on('ride:status', handler);
  return () => socket?.off('ride:status', handler);
}
