import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { requireAdminAuth } from '../middleware/auth.js';

export const settingsRouter = Router();

// GET /api/settings - Read system settings
settingsRouter.get('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value, description, updated_at FROM system_settings').all() as Array<{
      key: string;
      value: string;
      description: string;
      updated_at: string;
    }>;

    const settingsObj: Record<string, string> = {};
    for (const r of rows) {
      settingsObj[r.key] = r.value;
    }

    res.json({
      success: true,
      data: {
        settings: settingsObj,
        details: rows
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings - Update system settings (Admin only)
settingsRouter.put('/', requireAdminAuth, (req, res, next) => {
  try {
    const { settings } = req.body; // Key-value dictionary
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ success: false, message: 'settings object required' });
      return;
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const upsertStmt = db.prepare(`
      INSERT INTO system_settings (key, value, description, updated_at)
      VALUES (?, ?, '', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    for (const [key, value] of Object.entries(settings)) {
      upsertStmt.run(key, String(value), now);
    }

    res.json({
      success: true,
      message: 'System settings updated successfully'
    });
  } catch (err) {
    next(err);
  }
});
