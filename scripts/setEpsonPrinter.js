const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'database', 'photobooth.sqlite');

// 1. Update SQLite
const db = new DatabaseSync(DB_PATH);
db.prepare("UPDATE system_settings SET value = ?, updated_at = ? WHERE key = ?")
  .run('EPSON L8050 Series', new Date().toISOString(), 'default_printer');

const setting = db.prepare("SELECT key, value FROM system_settings WHERE key = 'default_printer'").get();
console.log('✅ SQLite updated:', setting);

// 2. Update .env files
['.env', 'backend/.env'].forEach((envFile) => {
  const filePath = path.join(ROOT_DIR, envFile);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/DEFAULT_PRINTER=.*/g, 'DEFAULT_PRINTER=EPSON L8050 Series');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${envFile} updated to EPSON L8050 Series`);
  }
});
