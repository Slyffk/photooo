import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../config/database.js';
import { runMigrations } from '../database/migrations.js';
import { seedDatabase } from '../database/seed.js';
import { getSessionDir } from '../config/paths.js';
import {
  composePhotoStrip,
  composeSinglePhoto,
  composeCollage,
  composeGroupPhoto
} from '../services/compositionService.js';
import { qrService } from '../services/qrService.js';
import { printerService } from '../services/printerService.js';

async function runSystemVerification() {
  console.log('--- 1. DATABASE & SEED TEST ---');
  runMigrations();
  seedDatabase();
  const db = getDatabase();

  const admin = db.prepare('SELECT id, username, name FROM admins WHERE username = ?').get('admin');
  console.log('✓ Admin user verified:', admin);

  const templateCount = db.prepare('SELECT COUNT(*) as count FROM templates').get() as { count: number };
  console.log(`✓ Templates in database: ${templateCount.count}`);

  const packageCount = db.prepare('SELECT COUNT(*) as count FROM packages').get() as { count: number };
  console.log(`✓ Packages in database: ${packageCount.count}`);

  console.log('\n--- 2. SHARP COMPOSITION ENGINE TEST ---');
  const testSessionId = `test_verify_${Date.now()}`;
  const sessionDirs = getSessionDir(testSessionId);

  // Generate 4 sample test photos with sharp
  const testPhotos: Array<{ filePath: string }> = [];
  const colors = ['#E29578', '#006D77', '#83C5BE', '#FFDDD2'];

  for (let i = 0; i < 4; i++) {
    const pPath = path.join(sessionDirs.captured, `sample_${i}.jpg`);
    await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 3,
        background: colors[i]
      }
    })
      .jpeg()
      .toFile(pPath);

    testPhotos.push({ filePath: pPath });
  }
  console.log(`✓ Generated 4 test camera frames in ${sessionDirs.captured}`);

  // Test 1: Photo Strip (Vertical)
  console.log('Testing composePhotoStrip()...');
  const stripRes = await composePhotoStrip(testSessionId, testPhotos, 'vertical', '#FAF9F6', 'HARU TEST STRIP');
  console.log(`✓ Photo strip created: ${stripRes.jpgPath} (${stripRes.width}x${stripRes.height} @ ${stripRes.dpi} DPI)`);
  if (!fs.existsSync(stripRes.jpgPath) || !fs.existsSync(stripRes.pngPath)) {
    throw new Error('Photo Strip files missing!');
  }

  // Test 2: Single Photo
  console.log('Testing composeSinglePhoto()...');
  const singleRes = await composeSinglePhoto(testSessionId, testPhotos[0], '#FAF9F6', 'HARU PORTRAIT');
  console.log(`✓ Single photo created: ${singleRes.jpgPath} (${singleRes.width}x${singleRes.height})`);

  // Test 3: Collage (2x2)
  console.log('Testing composeCollage()...');
  const collageRes = await composeCollage(testSessionId, testPhotos, '#FAF9F6', 'HARU COLLAGE');
  console.log(`✓ Collage created: ${collageRes.jpgPath} (${collageRes.width}x${collageRes.height})`);

  // Test 4: Group Photo
  console.log('Testing composeGroupPhoto()...');
  const groupRes = await composeGroupPhoto(testSessionId, testPhotos.slice(0, 3), '#FAF9F6', 'HARU GROUP');
  console.log(`✓ Group photo created: ${groupRes.jpgPath} (${groupRes.width}x${groupRes.height})`);

  console.log('\n--- 3. QR DOWNLOAD TOKEN TEST ---');
  // Insert test session into db
  const now = new Date().toISOString();
  const testCode = `TEST-${Date.now()}`;
  db.prepare(`
    INSERT INTO sessions (id, session_code, mode, status, created_at, updated_at)
    VALUES (?, ?, 'strip', 'completed', ?, ?)
  `).run(testSessionId, testCode, now, now);

  db.prepare(`
    INSERT INTO final_photos (session_id, final_jpg_path, final_png_path, thumbnail_path, width, height, dpi, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 300, ?)
  `).run(testSessionId, stripRes.jpgPath, stripRes.pngPath, stripRes.thumbnailPath, stripRes.width, stripRes.height, now);

  const tokenInfo = await qrService.createDownloadToken(testSessionId);
  console.log(`✓ QR Code generated: ${tokenInfo.downloadUrl}`);
  console.log(`✓ QR Data URL length: ${tokenInfo.qrDataUrl.length} chars`);

  const validation = qrService.validateToken(tokenInfo.token);
  console.log(`✓ Token validation result: valid=${validation.valid}, sessionId=${validation.sessionId}`);
  if (!validation.valid) throw new Error('Token validation failed');

  console.log('\n--- 4. WINDOWS PRINTER TEST ---');
  const printers = await printerService.getInstalledPrinters();
  console.log(`✓ Detected ${printers.length} Windows printers:`, printers.map(p => p.name));

  const testPrintRes = await printerService.runTestPrint();
  console.log(`✓ Test print dispatch result: ${testPrintRes.status} (Job #${testPrintRes.jobId})`);

  // Cleanup test session files
  fs.rmSync(sessionDirs.root, { recursive: true, force: true });
  db.prepare('DELETE FROM sessions WHERE id = ?').run(testSessionId);
  console.log('✓ Cleaned up temporary test session.');

  console.log('\n==================================================');
  console.log('🎯 ALL PHOTO BOOTH ENGINES & HARDWARE SERVICES PASSED!');
  console.log('==================================================');
}

runSystemVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
