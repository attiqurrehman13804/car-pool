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
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/pods', podsRoutes);
app.use('/rides', ridesRoutes);
app.use('/geofences', geofencesRoutes);

setupPodTracking(io);

server.listen(config.port, () => {
  console.log(`Car Pool API running on http://localhost:${config.port}`);
  console.log(`Allowed email domains: ${config.allowedEmailDomains.join(', ')}`);
});

export { app, server, io };
