import bcrypt from 'bcryptjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../config/database.js';
import { runMigrations } from './migrations.js';
import { populateUserTemplates } from './updateTemplates.js';

export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const netInterfaces = interfaces[name];
    if (netInterfaces) {
      for (const net of netInterfaces) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }
  return '127.0.0.1';
}

export function seedDatabase(): void {
  runMigrations();
  const db = getDatabase();

  const now = new Date().toISOString();

  // 1. Seed Admin user if none exists
  const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin123', salt);
    db.prepare(`
      INSERT INTO admins (username, password_hash, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', passwordHash, 'Super Admin', 'admin', now, now);
    console.log('Admin seeded: username "admin", password "admin123"');
  }

  // 2. Seed Default Kiosk
  const existingKiosk = db.prepare('SELECT id FROM kiosks LIMIT 1').get();
  if (!existingKiosk) {
    const localIp = getLocalIpAddress();
    db.prepare(`
      INSERT INTO kiosks (name, location, ip_address, status, last_heartbeat, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('Kiosk Station 01', 'Main Lobby', localIp, 'online', now, now, now);
  }

  // 3. Seed Packages
  const existingPackages = db.prepare('SELECT COUNT(*) as count FROM packages').get() as { count: number };
  if (existingPackages.count === 0) {
    const packages = [
      {
        name_en: 'Korean Photo Strip',
        name_th: 'โฟโต้สตริป 4 ช็อต สไตล์เกาหลี',
        description_en: 'Classic 4-cut vertical strip, perfect for bookmark or phone case',
        description_th: 'สตริปแนวตั้งยอดนิยม 4 ช็อต คลาสสิก เหมาะสำหรับพกพาหรือติดเคสมือถือ',
        mode: 'strip',
        photo_count: 4,
        display_order: 1
      },
      {
        name_en: 'Single Signature Portrait',
        name_th: 'ภาพเดี่ยว ซิกเนเจอร์ พอร์ตเทรต',
        description_en: 'Single high-definition beauty portrait with customized frame',
        description_th: 'ภาพถ่ายช็อตเดี่ยวคมชัดระดับโปร พร้อมกรอบรูปสวยงาม',
        mode: 'single',
        photo_count: 1,
        display_order: 2
      },
      {
        name_en: 'Creative 4-Cut Collage',
        name_th: 'โฟโต้คอลลาจ 4 ช่อง (2x2)',
        description_en: 'Aesthetic 2x2 grid collage with aesthetic pastel backgrounds',
        description_th: 'คอลลาจ 4 ช่องตาราง 2x2 จัดวางมุมมองสุดชิค',
        mode: 'collage',
        photo_count: 4,
        display_order: 3
      },
      {
        name_en: 'Group & Friends Celebration',
        name_th: 'กรุ๊ปช็อต ถ่ายร่วมกับเพื่อน',
        description_en: 'Wide ratio shots with extended countdown for fun groups',
        description_th: 'มุมกว้างสำหรับแก๊งเพื่อน พร้อมเวลานับถอยหลังพอเหมาะ',
        mode: 'group',
        photo_count: 3,
        display_order: 4
      }
    ];

    const insertPkg = db.prepare(`
      INSERT INTO packages (name_en, name_th, description_en, description_th, mode, photo_count, is_active, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);

    for (const p of packages) {
      insertPkg.run(p.name_en, p.name_th, p.description_en, p.description_th, p.mode, p.photo_count, p.display_order, now, now);
    }
    console.log('Packages seeded.');
  }

  // 4. Seed Templates
  const existingTemplates = db.prepare('SELECT COUNT(*) as count FROM templates').get() as { count: number };
  if (existingTemplates.count === 0) {
    const customConfigPath = path.resolve(__dirname, '../../../database/new_templates.json');
    if (fs.existsSync(customConfigPath)) {
      populateUserTemplates();
    } else {
    const templates = [
      {
        name_en: 'Haru Minimal Cream',
        name_th: 'ฮารุ มินิมอล ครีม',
        category: 'minimal',
        layout_type: 'strip_4_vertical',
        bg_color: '#FBF9F5',
        border_color: '#E8E3D9',
        canvas_width: 600,
        canvas_height: 1800,
        // 4 slots in vertical strip
        photo_slots_json: JSON.stringify([
          { x: 40, y: 50, width: 520, height: 380, radius: 12 },
          { x: 40, y: 460, width: 520, height: 380, radius: 12 },
          { x: 40, y: 870, width: 520, height: 380, radius: 12 },
          { x: 40, y: 1280, width: 520, height: 380, radius: 12 }
        ])
      },
      {
        name_en: 'Soft Pastel Lavender',
        name_th: 'ซอฟต์ ลาเวนเดอร์ พาสเทล',
        category: 'pastel',
        layout_type: 'strip_4_vertical',
        bg_color: '#EFEAFF',
        border_color: '#D8CEFA',
        canvas_width: 600,
        canvas_height: 1800,
        photo_slots_json: JSON.stringify([
          { x: 40, y: 50, width: 520, height: 380, radius: 14 },
          { x: 40, y: 460, width: 520, height: 380, radius: 14 },
          { x: 40, y: 870, width: 520, height: 380, radius: 14 },
          { x: 40, y: 1280, width: 520, height: 380, radius: 14 }
        ])
      },
      {
        name_en: 'Baby Pink Heart',
        name_th: 'เบบี้พิงค์ ฮาร์ท',
        category: 'cute',
        layout_type: 'strip_4_vertical',
        bg_color: '#FFF0F3',
        border_color: '#FFCCD5',
        canvas_width: 600,
        canvas_height: 1800,
        photo_slots_json: JSON.stringify([
          { x: 40, y: 50, width: 520, height: 380, radius: 16 },
          { x: 40, y: 460, width: 520, height: 380, radius: 16 },
          { x: 40, y: 870, width: 520, height: 380, radius: 16 },
          { x: 40, y: 1280, width: 520, height: 380, radius: 16 }
        ])
      },
      {
        name_en: 'Korean Butter Yellow 2x2',
        name_th: 'โคเรียน บัตเตอร์ เยลโล่ว์ 2x2',
        category: 'cute',
        layout_type: 'collage_2x2',
        bg_color: '#FFFDF0',
        border_color: '#FEEAA1',
        canvas_width: 1200,
        canvas_height: 1400,
        photo_slots_json: JSON.stringify([
          { x: 50, y: 50, width: 525, height: 580, radius: 16 },
          { x: 625, y: 50, width: 525, height: 580, radius: 16 },
          { x: 50, y: 680, width: 525, height: 580, radius: 16 },
          { x: 625, y: 680, width: 525, height: 580, radius: 16 }
        ])
      },
      {
        name_en: 'Monochrome Film Noir',
        name_th: 'โมโนโครม ฟิล์มนัวร์',
        category: 'minimal',
        layout_type: 'strip_4_vertical',
        bg_color: '#1C1C1E',
        border_color: '#3A3A3C',
        canvas_width: 600,
        canvas_height: 1800,
        photo_slots_json: JSON.stringify([
          { x: 40, y: 50, width: 520, height: 380, radius: 8 },
          { x: 40, y: 460, width: 520, height: 380, radius: 8 },
          { x: 40, y: 870, width: 520, height: 380, radius: 8 },
          { x: 40, y: 1280, width: 520, height: 380, radius: 8 }
        ])
      },
      {
        name_en: 'Happy Birthday Celebration',
        name_th: 'แฮปปี้เบิร์ธเดย์ เซเลเบรชั่น',
        category: 'birthday',
        layout_type: 'collage_2x2',
        bg_color: '#FFF5EB',
        border_color: '#FFD8A8',
        canvas_width: 1200,
        canvas_height: 1400,
        photo_slots_json: JSON.stringify([
          { x: 50, y: 50, width: 525, height: 580, radius: 16 },
          { x: 625, y: 50, width: 525, height: 580, radius: 16 },
          { x: 50, y: 680, width: 525, height: 580, radius: 16 },
          { x: 625, y: 680, width: 525, height: 580, radius: 16 }
        ])
      },
      {
        name_en: 'Love & Anniversary',
        name_th: 'เลิฟ แอนด์ แอนนิเวอร์ซารี',
        category: 'anniversary',
        layout_type: 'single',
        bg_color: '#FDF7F4',
        border_color: '#F8D7DA',
        canvas_width: 1200,
        canvas_height: 1600,
        photo_slots_json: JSON.stringify([
          { x: 80, y: 80, width: 1040, height: 1300, radius: 24 }
        ])
      },
      {
        name_en: 'Spring Blossom Festival',
        name_th: 'สปริง บลอสซั่ม เฟสติวัล',
        category: 'seasonal',
        layout_type: 'group',
        bg_color: '#F6FFF8',
        border_color: '#CCE3DE',
        canvas_width: 1800,
        canvas_height: 1200,
        photo_slots_json: JSON.stringify([
          { x: 60, y: 60, width: 520, height: 960, radius: 18 },
          { x: 640, y: 60, width: 520, height: 960, radius: 18 },
          { x: 1220, y: 60, width: 520, height: 960, radius: 18 }
        ])
      }
    ];

    const insertTpl = db.prepare(`
      INSERT INTO templates (
        name_en, name_th, category, thumbnail_url, frame_url, overlay_url,
        bg_color, border_color, layout_type, photo_slots_json, canvas_width, canvas_height,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    for (const t of templates) {
      insertTpl.run(
        t.name_en,
        t.name_th,
        t.category,
        `/storage/templates/thumb_${t.category}.svg`,
        '',
        '',
        t.bg_color,
        t.border_color,
        t.layout_type,
        t.photo_slots_json,
        t.canvas_width,
        t.canvas_height,
        now,
        now
      );
    }
      console.log('Templates seeded.');
    }
  }

  // 5. Seed System Settings
  const defaultSettings: Array<[string, string, string]> = [
    ['business_name', 'HARU MOMENTS PHOTO BOOTH', 'Brand and business display name'],
    ['business_tagline', 'Self Photo Studio & Memory Kiosk', 'Tagline shown on kiosk home'],
    ['countdown_seconds', '5', 'Default camera countdown duration (3, 5, or 10 seconds)'],
    ['session_timeout_seconds', '240', 'Max idle timeout before session resets'],
    ['completion_timeout_seconds', '30', 'Auto return to home after completion'],
    ['retention_days', '7', 'Number of days to keep session photos before cleanup'],
    ['qr_expiration_hours', '24', 'Hours before QR download token expires'],
    ['default_printer', process.env.DEFAULT_PRINTER || 'EPSON L8050 Series', 'Target Windows printer name'],
    ['default_paper_size', '4x6', 'Default paper size (4x6, 2x6, A4)'],
    ['default_copies', '1', 'Default print copies'],
    ['sound_enabled', 'true', 'Enable audio shutter and countdown beeps'],
    ['flash_enabled', 'true', 'Enable visual screen flash effect'],
    ['default_language', 'th', 'Default kiosk language (th or en)'],
    ['server_lan_ip', getLocalIpAddress(), 'Kiosk PC local LAN IP address for QR codes'],
    ['server_port', '5000', 'Backend HTTP server port'],
    ['kiosk_port', '5173', 'Frontend Kiosk UI port']
  ];

  const insertSetting = db.prepare(`
    INSERT INTO system_settings (key, value, description, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET updated_at = excluded.updated_at
  `);

  for (const [k, v, desc] of defaultSettings) {
    insertSetting.run(k, v, desc, now);
  }

  console.log('System settings seeded.');
}

// Allow direct run via tsx
if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase();
  console.log('Database initialization and seeding complete.');
  process.exit(0);
}
