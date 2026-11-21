const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BIN_DIR = path.join(PROJECT_ROOT, 'bin');
const CLOUDFLARED_EXE = path.join(BIN_DIR, 'cloudflared.exe');
const DB_PATH = path.join(PROJECT_ROOT, 'database', 'photobooth.sqlite');

// Update database custom_base_url setting
function updateDatabaseUrl(url) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(DB_PATH);
    const now = new Date().toISOString();

    const upsertStmt = db.prepare(`
      INSERT INTO system_settings (key, value, description, updated_at)
      VALUES ('custom_base_url', ?, 'Cloudflare Tunnel 4G/5G Public URL', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    upsertStmt.run(url, now);
    db.close();
    return true;
  } catch (err) {
    console.error('Could not update database settings:', err.message);
    return false;
  }
}

console.clear();
console.log('========================================================================');
console.log('  🚀 กำลังเชื่อมต่อ Cloudflare Tunnel สำหรับสแกน QR Code 4G/5G...');
console.log('========================================================================\n');

if (!fs.existsSync(CLOUDFLARED_EXE)) {
  console.log('❌ ไม่พบไฟล์ bin/cloudflared.exe กรุณารัน setup-cloudflared.js ก่อน');
  process.exit(1);
}

const tunnelProcess = spawn(CLOUDFLARED_EXE, ['tunnel', '--url', 'http://localhost:5000'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let tunnelUrlFound = false;

function handleOutput(data) {
  const text = data.toString();

  // Search for https://*.trycloudflare.com
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !tunnelUrlFound) {
    tunnelUrlFound = true;
    const publicUrl = match[0];

    updateDatabaseUrl(publicUrl);

    console.clear();
    console.log('========================================================================');
    console.log('  🎉 CLOUDFLARE 4G/5G TUNNEL เชื่อมต่อสำเร็จเรียบร้อย!');
    console.log('========================================================================');
    console.log('');
    console.log('  📱 ลิงก์สาธารณะ (Public URL):');
    console.log(`     👉 \x1b[1m\x1b[32m${publicUrl}\x1b[0m`);
    console.log('');
    console.log('  ✅ ระบบ Kiosk ได้อัปเดต QR Code เป็นลิงก์นี้ให้อัตโนมัติแล้ว');
    console.log('  ✨ ลูกค้าสามารถใช้เน็ต 4G / 5G จากมือถือทุกเครื่อง สแกนปุ๊บโหลดได้ทันที 100%');
    console.log('');
    console.log('  ------------------------------------------------------------------------');
    console.log('  📌 หมายเหตุ: เปิดหน้าต่างนี้ทิ้งไว้ตลอดการเปิดตู้ใช้งาน');
    console.log('  (กด Ctrl + C เพื่อหยุดการทำงานและคืนค่าเป็นโหมดวงแลน)');
    console.log('========================================================================\n');
  }
}

tunnelProcess.stdout.on('data', handleOutput);
tunnelProcess.stderr.on('data', handleOutput);

tunnelProcess.on('close', (code) => {
  console.log(`\nTunnel process ended (exit code: ${code})`);
  updateDatabaseUrl('');
});

function cleanup() {
  console.log('\nกำลังปิด Cloudflare Tunnel และคืนค่าระบบ...');
  updateDatabaseUrl('');
  try {
    tunnelProcess.kill('SIGTERM');
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
