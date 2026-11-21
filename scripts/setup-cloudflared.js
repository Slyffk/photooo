const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BIN_DIR = path.join(PROJECT_ROOT, 'bin');
const CLOUDFLARED_EXE = path.join(BIN_DIR, 'cloudflared.exe');

const DOWNLOAD_URL = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';

async function ensureCloudflared() {
  if (fs.existsSync(CLOUDFLARED_EXE)) {
    const stats = fs.statSync(CLOUDFLARED_EXE);
    if (stats.size > 20 * 1024 * 1024) {
      console.log('✅ พบไฟล์ Cloudflare Tunnel (cloudflared.exe) แล้ว');
      return CLOUDFLARED_EXE;
    }
  }

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  console.log('⬇️  กำลังดาวน์โหลด Cloudflare Tunnel (cloudflared.exe)...');
  console.log('    URL: ' + DOWNLOAD_URL);

  const response = await fetch(DOWNLOAD_URL, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download cloudflared: ${response.statusText}`);
  }

  const totalBytes = Number(response.headers.get('content-length')) || 55000000;
  let downloadedBytes = 0;

  const fileStream = fs.createWriteStream(CLOUDFLARED_EXE);
  const reader = response.body.getReader();

  let lastLoggedPercent = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    fileStream.write(value);
    downloadedBytes += value.length;

    const percent = Math.floor((downloadedBytes / totalBytes) * 100);
    if (percent >= lastLoggedPercent + 20) {
      lastLoggedPercent = percent;
      console.log(`    ดาวน์โหลดแล้ว: ${percent}% (${Math.round(downloadedBytes / (1024 * 1024))} MB)`);
    }
  }

  fileStream.end();
  await new Promise((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });

  console.log('✅ ดาวน์โหลด Cloudflare Tunnel สำเร็จเรียบร้อย!\n');
  return CLOUDFLARED_EXE;
}

module.exports = { ensureCloudflared, CLOUDFLARED_EXE };

if (require.main === module) {
  ensureCloudflared().catch(console.error);
}
