const { getDatabase } = require('../dist/config/database.js');
const db = getDatabase();

console.log('CUSTOM_BASE_URL:');
console.log(db.prepare('SELECT * FROM system_settings WHERE key = ?').get('custom_base_url'));

console.log('\nLATEST DOWNLOAD TOKENS:');
const tokens = db.prepare('SELECT id, session_id, download_url, expires_at FROM download_tokens ORDER BY id DESC LIMIT 5').all();
console.log(tokens);
