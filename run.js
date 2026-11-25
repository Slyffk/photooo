const { spawn, exec } = require('child_process');
const path = require('path');

console.clear();
console.log('========================================================================');
console.log('  📸 HARU PHOTO BOOTH - KIOSK SYSTEM');
console.log('========================================================================\n');
console.log('⏳ กำลังเริ่มต้นระบบ Backend API และ Frontend Kiosk UI...\n');

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

// 1. Start Backend Server
const backend = spawn('npm.cmd', ['run', 'dev'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true
});

backend.on('error', (err) => {
  console.error('❌ Backend failed to start:', err.message);
});

// 2. Start Frontend Server
const frontend = spawn('npm.cmd', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true
});

frontend.on('error', (err) => {
  console.error('❌ Frontend failed to start:', err.message);
});

// 3. Open Browser automatically once servers are ready
let browserOpened = false;
setTimeout(() => {
  if (!browserOpened) {
    browserOpened = true;
    console.log('\n========================================================================');
    console.log('  🎉 ระบบเปิดสำเร็จเรียบร้อยแล้ว!');
    console.log('  👉 เปิดเบราว์เซอร์ไปที่: http://localhost:5173');
    console.log('========================================================================\n');
    exec('start http://localhost:5173');
  }
}, 3500);

// Cleanup on exit
function cleanup() {
  console.log('\nกำลังปิดระบบ Photo Booth...');
  try { backend.kill(); } catch {}
  try { frontend.kill(); } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
