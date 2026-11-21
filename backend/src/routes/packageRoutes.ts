import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { requireAdminAuth } from '../middleware/auth.js';

export const packageRouter = Router();

// GET /api/packages - List packages
packageRouter.get('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const { activeOnly = 'true' } = req.query;

    let sql = 'SELECT * FROM packages WHERE 1=1';
    if (activeOnly === 'true') {
      sql += ' AND is_active = 1';
    }
    sql += ' ORDER BY display_order ASC, id ASC';

    const packages = db.prepare(sql).all();
    res.json({ success: true, data: packages });
  } catch (err) {
    next(err);
  }
});

// POST /api/packages - Create package (Admin only)
packageRouter.post('/', requireAdminAuth, (req, res, next) => {
  try {
    const { name_en, name_th, description_en, description_th, mode, photo_count, display_order = 0 } = req.body;
    if (!name_en || !mode || !photo_count) {
      res.status(400).json({ success: false, message: 'name_en, mode, and photo_count are required' });
      return;
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO packages (name_en, name_th, description_en, description_th, mode, photo_count, is_active, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(name_en, name_th || name_en, description_en || '', description_th || '', mode, photo_count, display_order, now, now);

    const created = db.prepare('SELECT * FROM packages WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/packages/:id - Update package (Admin only)
packageRouter.put('/:id', requireAdminAuth, (req, res, next) => {
  try {
    const db = getDatabase();
    const { name_en, name_th, description_en, description_th, mode, photo_count, is_active, display_order } = req.body;
    const now = new Date().toISOString();

    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (name_en !== undefined) { updates.push('name_en = ?'); params.push(name_en); }
    if (name_th !== undefined) { updates.push('name_th = ?'); params.push(name_th); }
    if (description_en !== undefined) { updates.push('description_en = ?'); params.push(description_en); }
    if (description_th !== undefined) { updates.push('description_th = ?'); params.push(description_th); }
    if (mode !== undefined) { updates.push('mode = ?'); params.push(mode); }
    if (photo_count !== undefined) { updates.push('photo_count = ?'); params.push(photo_count); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (display_order !== undefined) { updates.push('display_order = ?'); params.push(display_order); }

    params.push(req.params.id);
    db.prepare(`UPDATE packages SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/packages/:id - Delete package (Admin only)
packageRouter.delete('/:id', requireAdminAuth, (req, res, next) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM packages WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (err) {
    next(err);
  }
});
