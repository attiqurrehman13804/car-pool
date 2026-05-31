import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import podsRoutes from './routes/pods.routes';
import ridesRoutes from './routes/rides.routes';
import geofencesRoutes from './routes/geofences.routes';
import profileRoutes from './routes/profile.routes';
import vehiclesRoutes from './routes/vehicles.routes';
import schedulesRoutes from './routes/schedules.routes';
import geocodeRoutes from './routes/geocode.routes';
import notificationsRoutes from './routes/notifications.routes';
import adminRoutes from './routes/admin.routes';
import messagesRoutes from './routes/messages.routes';
import { setupPodTracking } from './socket/podTracking';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }));
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/', (_req, res) => {
  res.json({ message: 'Pool Bus API', version: '2.0.0' });
});

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/vehicles', vehiclesRoutes);
app.use('/schedules', schedulesRoutes);
app.use('/pods', podsRoutes);
app.use('/rides', ridesRoutes);
app.use('/geofences', geofencesRoutes);
app.use('/geocode', geocodeRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/admin', adminRoutes);
app.use('/messages', messagesRoutes);

setupPodTracking(io);

server.listen(config.port, () => {
  console.log(`Pool Bus API running on port ${config.port}`);
  console.log(`Allowed email domains: ${config.allowedEmailDomains.join(', ')}`);
});

export { app, server, io };
