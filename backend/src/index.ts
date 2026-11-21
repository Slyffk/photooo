import express from 'express';
import http from 'node:http';
import cors from 'cors';
import path from 'node:path';
import dotenv from 'dotenv';

import { STORAGE_ROOT } from './config/paths.js';
import { runMigrations } from './database/migrations.js';
import { seedDatabase, getLocalIpAddress } from './database/seed.js';
import { initWebSocketServer } from './services/websocketService.js';
import { startCleanupSchedule } from './services/cleanupService.js';
import { tunnelService } from './services/tunnelService.js';
import { errorHandler } from './middleware/errorHandler.js';

import { sessionRouter } from './routes/sessionRoutes.js';
import { photoRouter } from './routes/photoRoutes.js';
import { templateRouter } from './routes/templateRoutes.js';
import { packageRouter } from './routes/packageRoutes.js';
import { cameraRouter } from './routes/cameraRoutes.js';
import { printRouter } from './routes/printRoutes.js';
import { downloadRouter } from './routes/downloadRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';
import { settingsRouter } from './routes/settingsRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initWebSocketServer(server);

// Enable CORS for touchscreen frontend and mobile phones on LAN
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Generous body limit for high-resolution photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static storage directory
app.use('/storage', express.static(STORAGE_ROOT));

// Customer QR Download Landing Page
app.use('/download', downloadRouter);

// API Routes
app.use('/api/sessions', sessionRouter);
app.use('/api/photos', photoRouter);
app.use('/api/templates', templateRouter);
app.use('/api/packages', packageRouter);
app.use('/api/camera', cameraRouter);
app.use('/api/print', printRouter);
app.use('/api/download', downloadRouter);
app.use('/api/admin', adminRouter);
app.use('/api/settings', settingsRouter);

// Kiosk Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    kiosk: 'HARU PHOTO BOOTH',
    time: new Date().toISOString(),
    ip: getLocalIpAddress()
  });
});

// Tunnel status & restart endpoints
app.get('/api/tunnel/status', (req, res) => {
  res.json({
    connected: tunnelService.isConnected(),
    url: tunnelService.getTunnelUrl()
  });
});

app.post('/api/tunnel/restart', async (req, res) => {
  tunnelService.stopTunnel();
  const url = await tunnelService.startTunnel(PORT);
  res.json({
    connected: !!url,
    url
  });
});

// Central error handler
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';

// Initialize Database & Background Tasks
try {
  runMigrations();
  seedDatabase();
  startCleanupSchedule();
} catch (err) {
  console.error('Error during database initialization:', err);
}

server.listen(PORT, HOST, () => {
  const localIp = getLocalIpAddress();
  console.log(`=======================================================`);
  console.log(`📸 SMART PHOTO BOOTH KIOSK SERVER`);
  console.log(`=======================================================`);
  console.log(`🚀 Local Server:      http://localhost:${PORT}`);
  console.log(`📱 LAN Network IP:    http://${localIp}:${PORT}`);
  console.log(`⚡ WebSocket Stream:   ws://${localIp}:${PORT}/ws`);
  console.log(`💾 Storage Root:      ${STORAGE_ROOT}`);
  console.log(`=======================================================`);

  // Start Cloudflare Tunnel automatically for instant 4G/5G mobile QR scanning
  tunnelService.startTunnel(PORT).catch((err) => {
    console.warn('[Tunnel] Could not initialize Cloudflare tunnel:', err);
  });
});

// Graceful shutdown
const handleExit = () => {
  console.log('\nShutting down photo booth server...');
  tunnelService.stopTunnel();
  server.close(() => {
    process.exit(0);
  });
};
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
