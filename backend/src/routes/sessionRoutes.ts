import { Router } from 'express';
import crypto from 'node:crypto';
import { getDatabase } from '../config/database.js';
import { getSessionDir } from '../config/paths.js';
import { broadcastEvent } from '../services/websocketService.js';

export const sessionRouter = Router();

// POST /api/sessions - Create a new session
sessionRouter.post('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const sessionId = crypto.randomUUID();
    const sessionCode = `HB-${Math.floor(100000 + Math.random() * 900000)}`;
    const { mode = 'strip', language = 'th', photoCount = 4 } = req.body;
    const now = new Date().toISOString();

    // Ensure session storage directories exist
    getSessionDir(sessionId);

    db.prepare(`
      INSERT INTO sessions (id, session_code, mode, template_id, status, language, photo_count, print_count, created_at, updated_at)
      VALUES (?, ?, ?, NULL, 'created', ?, ?, 0, ?, ?)
    `).run(sessionId, sessionCode, mode, language, photoCount, now, now);

    // Update default kiosk active session
    db.prepare(`UPDATE kiosks SET active_session_id = ?, last_heartbeat = ? WHERE id = 1`)
      .run(sessionId, now);

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);

    broadcastEvent('session_updated', { session });

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id - Get session by ID
sessionRouter.get('/:id', (req, res, next) => {
  try {
    const db = getDatabase();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as any;

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const capturedPhotos = db.prepare(`
      SELECT * FROM captured_photos WHERE session_id = ? ORDER BY sort_order ASC, shot_index ASC
    `).all(req.params.id);

    const finalPhoto = db.prepare(`
      SELECT * FROM final_photos WHERE session_id = ? ORDER BY id DESC LIMIT 1
    `).get(req.params.id);

    const printJobs = db.prepare(`
      SELECT * FROM print_jobs WHERE session_id = ? ORDER BY id DESC
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...session,
        capturedPhotos,
        finalPhoto,
        printJobs
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/sessions/:id - Update session attributes
sessionRouter.patch('/:id', (req, res, next) => {
  try {
    const db = getDatabase();
    const { mode, templateId, status, language, photoCount } = req.body;
    const now = new Date().toISOString();

    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (mode !== undefined) {
      updates.push('mode = ?');
      params.push(mode);
    }
    if (templateId !== undefined) {
      updates.push('template_id = ?');
      params.push(templateId);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'completed') {
        updates.push('completed_at = ?');
        params.push(now);
      }
    }
    if (language !== undefined) {
      updates.push('language = ?');
      params.push(language);
    }
    if (photoCount !== undefined) {
      updates.push('photo_count = ?');
      params.push(photoCount);
    }

    params.push(req.params.id);

    const sql = `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);

    const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    broadcastEvent('session_updated', { session: updated });

    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/reset - Reset kiosk state and clear active session
sessionRouter.post('/:id/reset', (req, res, next) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.prepare(`UPDATE sessions SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(now, req.params.id);
    db.prepare(`UPDATE kiosks SET active_session_id = NULL, last_heartbeat = ? WHERE active_session_id = ?`).run(now, req.params.id);

    res.json({ success: true, message: 'Session reset successfully' });
  } catch (err) {
    next(err);
  }
});
