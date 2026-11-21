import { getDatabase } from '../config/database.js';
import fs from 'node:fs';
import path from 'node:path';

export function populateUserTemplates(): void {
  const db = getDatabase();
  const configPath = path.resolve(__dirname, '../../../database/new_templates.json');
  const configs = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const now = new Date().toISOString();

  db.exec('DELETE FROM templates;');

  const insertTpl = db.prepare(`
    INSERT INTO templates (
      id, name_en, name_th, category, thumbnail_url, frame_url, overlay_url,
      bg_color, border_color, layout_type, photo_slots_json, canvas_width, canvas_height,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 726, 1024, 1, ?, ?)
  `);

  for (const t of configs) {
    insertTpl.run(
      t.id,
      t.name_en,
      t.name_th,
      t.category,
      `/storage/templates/${t.thumb}`,
      `/storage/templates/${t.source}`,
      `/storage/templates/${t.overlay}`,
      '#FFFFFF',
      'transparent',
      t.layout_type,
      JSON.stringify(t.slots),
      now,
      now
    );
    console.log(`Inserted template ${t.id}: ${t.name_en}`);
  }
}

populateUserTemplates();
