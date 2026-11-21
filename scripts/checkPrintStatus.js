const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/photobooth.sqlite');
const db = new DatabaseSync(dbPath);

console.log('=== LATEST SESSIONS ===');
const sessions = db.prepare('SELECT id, session_code, mode, status, print_count, created_at FROM sessions ORDER BY created_at DESC LIMIT 5').all();
console.log(sessions);

console.log('\n=== LATEST PRINT JOBS ===');
const printJobs = db.prepare('SELECT * FROM print_jobs ORDER BY id DESC LIMIT 5').all();
console.log(printJobs);

console.log('\n=== FINAL PHOTOS ===');
const finalPhotos = db.prepare('SELECT id, session_id, file_path, status, created_at FROM final_photos ORDER BY id DESC LIMIT 5').all();
console.log(finalPhotos);
