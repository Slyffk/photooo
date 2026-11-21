import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { requireAdminAuth } from '../middleware/auth.js';

export const templateRouter = Router();

// GET /api/templates - List templates
templateRouter.get('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const { category, activeOnly = 'true' } = req.query;

    let sql = 'SELECT * FROM templates WHERE 1=1';
    const params: any[] = [];

    if (activeOnly === 'true') {
      sql += ' AND is_active = 1';
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY id ASC';

    const templates = db.prepare(sql).all(...params);
    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
});

// GET /api/templates/:id - Single template details
templateRouter.get('/:id', (req, res, next) => {
  try {
    const db = getDatabase();
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
});

// POST /api/templates - Create template (Admin only)
templateRouter.post('/', requireAdminAuth, (req, res, next) => {
  try {
    const {
      name_en,
      name_th,
      category,
      thumbnail_url = '/storage/templates/thumb_minimal.svg',
      frame_url = '',
      overlay_url = '',
      bg_color = '#FAF9F6',
      border_color = '#E8E3D9',
      layout_type = 'strip_4_vertical',
      photo_slots_json,
      canvas_width = 600,
      canvas_height = 1800,
      is_active = 1
    } = req.body;

    if (!name_en || !category || !photo_slots_json) {
      res.status(400).json({ success: false, message: 'name_en, category, and photo_slots_json are required' });
      return;
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    const insertRes = db.prepare(`
      INSERT INTO templates (
        name_en, name_th, category, thumbnail_url, frame_url, overlay_url,
        bg_color, border_color, layout_type, photo_slots_json, canvas_width, canvas_height,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name_en,
      name_th || name_en,
      category,
      thumbnail_url,
      frame_url,
      overlay_url,
      bg_color,
      border_color,
      layout_type,
      photo_slots_json,
      canvas_width,
      canvas_height,
      is_active,
      now,
      now
    );

    const newTemplate = db.prepare('SELECT * FROM templates WHERE id = ?').get(insertRes.lastInsertRowid);
    res.status(201).json({ success: true, data: newTemplate });
  } catch (err) {
    next(err);
  }
});

// PUT /api/templates/:id - Update template (Admin only)
templateRouter.put('/:id', requireAdminAuth, (req, res, next) => {
  try {
    const db = getDatabase();
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    const {
      name_en,
      name_th,
      category,
      thumbnail_url,
      bg_color,
      border_color,
      layout_type,
      photo_slots_json,
      is_active
    } = req.body;

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (name_en !== undefined) { updates.push('name_en = ?'); params.push(name_en); }
    if (name_th !== undefined) { updates.push('name_th = ?'); params.push(name_th); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (thumbnail_url !== undefined) { updates.push('thumbnail_url = ?'); params.push(thumbnail_url); }
    if (bg_color !== undefined) { updates.push('bg_color = ?'); params.push(bg_color); }
    if (border_color !== undefined) { updates.push('border_color = ?'); params.push(border_color); }
    if (layout_type !== undefined) { updates.push('layout_type = ?'); params.push(layout_type); }
    if (photo_slots_json !== undefined) { updates.push('photo_slots_json = ?'); params.push(photo_slots_json); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    params.push(req.params.id);
    db.prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/templates/:id - Delete template (Admin only)
templateRouter.delete('/:id', requireAdminAuth, (req, res, next) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (err) {
    next(err);
  }
});
