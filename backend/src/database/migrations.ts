import { getDatabase } from '../config/database.js';

export function runMigrations(): void {
  const db = getDatabase();

  const migrationSql = `
    -- 1. Admins
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 2. Kiosks
    CREATE TABLE IF NOT EXISTS kiosks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      status TEXT DEFAULT 'online',
      active_session_id TEXT DEFAULT NULL,
      last_heartbeat TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 3. Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      session_code TEXT UNIQUE NOT NULL,
      mode TEXT NOT NULL,
      template_id INTEGER DEFAULT NULL,
      status TEXT NOT NULL,
      language TEXT DEFAULT 'th',
      photo_count INTEGER DEFAULT 4,
      print_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT DEFAULT NULL,
      updated_at TEXT NOT NULL
    );

    -- 4. Packages (Organization of services, no payments)
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_th TEXT NOT NULL,
      description_en TEXT DEFAULT '',
      description_th TEXT DEFAULT '',
      mode TEXT NOT NULL,
      photo_count INTEGER NOT NULL DEFAULT 4,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 5. Templates
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_th TEXT NOT NULL,
      category TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      frame_url TEXT DEFAULT '',
      overlay_url TEXT DEFAULT '',
      bg_color TEXT DEFAULT '#FFFFFF',
      border_color TEXT DEFAULT '#F5F5F5',
      layout_type TEXT DEFAULT 'strip_4_vertical',
      photo_slots_json TEXT NOT NULL,
      canvas_width INTEGER DEFAULT 1200,
      canvas_height INTEGER DEFAULT 1800,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 6. Captured Photos
    CREATE TABLE IF NOT EXISTS captured_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      shot_index INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      width INTEGER DEFAULT 1920,
      height INTEGER DEFAULT 1080,
      is_selected INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    -- 7. Final Photos
    CREATE TABLE IF NOT EXISTS final_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      template_id INTEGER DEFAULT NULL,
      final_jpg_path TEXT NOT NULL,
      final_png_path TEXT NOT NULL,
      thumbnail_path TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      dpi INTEGER DEFAULT 300,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    -- 8. Print Jobs
    CREATE TABLE IF NOT EXISTS print_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      final_photo_id INTEGER NOT NULL,
      printer_name TEXT NOT NULL,
      copies INTEGER NOT NULL DEFAULT 1,
      paper_size TEXT DEFAULT '4x6',
      orientation TEXT DEFAULT 'portrait',
      status TEXT NOT NULL DEFAULT 'submitted',
      error_message TEXT DEFAULT NULL,
      submitted_at TEXT NOT NULL,
      completed_at TEXT DEFAULT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    -- 9. Download Tokens
    CREATE TABLE IF NOT EXISTS download_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      download_url TEXT NOT NULL,
      qr_data_url TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      download_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    -- 10. System Settings
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    );

    -- Indexes for high-performance querying
    CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(session_code);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_captured_photos_session ON captured_photos(session_id);
    CREATE INDEX IF NOT EXISTS idx_final_photos_session ON final_photos(session_id);
    CREATE INDEX IF NOT EXISTS idx_print_jobs_session ON print_jobs(session_id);
    CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token);
  `;

  db.exec(migrationSql);
  console.log('Database tables migrated successfully.');
}
