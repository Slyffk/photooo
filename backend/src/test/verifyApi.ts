import express from 'express';
import http from 'node:http';
import cors from 'cors';
import { runMigrations } from '../database/migrations.js';
import { seedDatabase } from '../database/seed.js';
import { sessionRouter } from '../routes/sessionRoutes.js';
import { photoRouter } from '../routes/photoRoutes.js';
import { templateRouter } from '../routes/templateRoutes.js';
import { packageRouter } from '../routes/packageRoutes.js';
import { cameraRouter } from '../routes/cameraRoutes.js';
import { printRouter } from '../routes/printRoutes.js';
import { downloadRouter } from '../routes/downloadRoutes.js';
import { adminRouter } from '../routes/adminRoutes.js';
import { settingsRouter } from '../routes/settingsRoutes.js';

async function runApiVerification() {
  console.log('--- STARTING REST API INTEGRATION TEST ---');
  runMigrations();
  seedDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.use('/api/sessions', sessionRouter);
  app.use('/api/photos', photoRouter);
  app.use('/api/templates', templateRouter);
  app.use('/api/packages', packageRouter);
  app.use('/api/camera', cameraRouter);
  app.use('/api/print', printRouter);
  app.use('/api/download', downloadRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/settings', settingsRouter);

  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(5099, '127.0.0.1', () => resolve()));
  console.log('✓ Test API server listening on 127.0.0.1:5099');

  const BASE = 'http://127.0.0.1:5099/api';

  try {
    // 1. Templates endpoint
    const tplRes = await fetch(`${BASE}/templates`).then((r) => r.json());
    console.log(`✓ GET /api/templates returned ${tplRes.data.length} templates (Status: ${tplRes.success})`);

    // 2. Packages endpoint
    const pkgRes = await fetch(`${BASE}/packages`).then((r) => r.json());
    console.log(`✓ GET /api/packages returned ${pkgRes.data.length} packages (Status: ${pkgRes.success})`);

    // 3. Camera status endpoint
    const camRes = await fetch(`${BASE}/camera/status`).then((r) => r.json());
    console.log(`✓ GET /api/camera/status: adapter="${camRes.data.adapter}", status="${camRes.data.status}"`);

    // 4. Printers endpoint
    const printRes = await fetch(`${BASE}/print/printers`).then((r) => r.json());
    console.log(`✓ GET /api/print/printers: ${printRes.data.printers.length} printers detected, default="${printRes.data.defaultPrinter}"`);

    // 5. Create Session
    const sessRes = await fetch(`${BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'strip', language: 'th', photoCount: 4 })
    }).then((r) => r.json());
    console.log(`✓ POST /api/sessions: Created session ${sessRes.data.id} (${sessRes.data.session_code})`);

    // 6. Admin Login
    const loginRes = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    }).then((r) => r.json());
    console.log(`✓ POST /api/admin/login: JWT token received for user ${loginRes.data.user.username}`);

    const token = loginRes.data.token;

    // 7. Admin Dashboard Stats
    const dashRes = await fetch(`${BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json());
    console.log(`✓ GET /api/admin/dashboard: totalSessions=${dashRes.data.totalSessions}, storageUsed=${dashRes.data.storage.usedMB}MB`);

    // Clean up test session
    await fetch(`${BASE}/sessions/${sessRes.data.id}/reset`, { method: 'POST' });

    console.log('\n==================================================');
    console.log('🎯 ALL REST API INTEGRATION TESTS PASSED!');
    console.log('==================================================');
  } finally {
    server.close();
  }
}

runApiVerification().catch((err) => {
  console.error('API Verification error:', err);
  process.exit(1);
});
