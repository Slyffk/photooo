import { Router } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../config/database.js';
import { signAdminToken, requireAdminAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { STORAGE_ROOT, getSessionDir } from '../config/paths.js';
import { printerService } from '../services/printerService.js';
import { cameraManager } from '../services/cameraService.js';

export const adminRouter = Router();

// Helper to calculate directory size
function getDirSizeBytes(dirPath: string): number {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      size += getDirSizeBytes(fullPath);
    } else {
      try {
        size += fs.statSync(fullPath).size;
      } catch {
        // ignore
      }
    }
  }
  return size;
}

// POST /api/admin/login
adminRouter.post('/login', (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required' });
      return;
    }

    const db = getDatabase();
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as any;

    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
      return;
    }

    const token = signAdminToken({
      id: admin.id,
      username: admin.username,
      role: admin.role
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          role: admin.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/me - Verify token
adminRouter.get('/me', requireAdminAuth, (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const admin = db.prepare('SELECT id, username, name, role, created_at FROM admins WHERE id = ?').get(req.adminUser!.id);
  res.json({ success: true, data: admin });
});

// GET /api/admin/dashboard - High-level operational metrics
adminRouter.get('/dashboard', requireAdminAuth, async (req, res, next) => {
  try {
    const db = getDatabase();

    const todayStr = new Date().toISOString().substring(0, 10);
    const thisMonthStr = new Date().toISOString().substring(0, 7);

    // Total sessions
    const totalSessionsRow = db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
    const todaySessionsRow = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE created_at LIKE ?').get(`${todayStr}%`) as { count: number };
    const monthlySessionsRow = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE created_at LIKE ?').get(`${thisMonthStr}%`) as { count: number };

    // Total photos
    const totalPhotosRow = db.prepare('SELECT COUNT(*) as count FROM captured_photos').get() as { count: number };

    // Total prints
    const totalPrintsRow = db.prepare("SELECT COALESCE(SUM(copies), 0) as count FROM print_jobs WHERE status = 'completed'").get() as { count: number };

    // Popular photo mode
    const popularModeRow = db.prepare(`
      SELECT mode, COUNT(*) as count FROM sessions GROUP BY mode ORDER BY count DESC LIMIT 1
    `).get() as { mode: string; count: number } | undefined;

    // Camera and Printer Health
    const cameraStatus = await cameraManager.getStatus();
    const installedPrinters = await printerService.getInstalledPrinters();
    const defaultPrinter = await printerService.getDefaultPrinter();

    // Storage Usage
    const storageSizeBytes = getDirSizeBytes(STORAGE_ROOT);
    const storageSizeMB = (storageSizeBytes / (1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      data: {
        totalSessions: totalSessionsRow.count,
        todaySessions: todaySessionsRow.count,
        monthlySessions: monthlySessionsRow.count,
        totalPhotos: totalPhotosRow.count,
        totalPrints: totalPrintsRow.count,
        popularMode: popularModeRow ? popularModeRow.mode : 'strip',
        camera: cameraStatus,
        printer: {
          defaultPrinter,
          totalInstalled: installedPrinters.length,
          status: installedPrinters.some(p => p.status === 'ready' || p.status === 'virtual') ? 'ready' : 'offline'
        },
        storage: {
          usedBytes: storageSizeBytes,
          usedMB: parseFloat(storageSizeMB)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/sessions - List session history
adminRouter.get('/sessions', requireAdminAuth, (req, res, next) => {
  try {
    const db = getDatabase();
    const { search, mode, status, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT s.*, 
        (SELECT COUNT(*) FROM captured_photos c WHERE c.session_id = s.id) as photo_shots,
        (SELECT final_jpg_path FROM final_photos f WHERE f.session_id = s.id ORDER BY f.id DESC LIMIT 1) as final_jpg,
        (SELECT thumbnail_path FROM final_photos f WHERE f.session_id = s.id ORDER BY f.id DESC LIMIT 1) as thumbnail,
        (SELECT status FROM print_jobs p WHERE p.session_id = s.id ORDER BY p.id DESC LIMIT 1) as last_print_status
      FROM sessions s
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ' AND (s.session_code LIKE ? OR s.id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (mode) {
      sql += ' AND s.mode = ?';
      params.push(mode);
    }
    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    // Total count for pagination
    const countSql = `SELECT COUNT(*) as count FROM (${sql})`;
    const countRow = db.prepare(countSql).get(...params) as { count: number };

    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const rows = db.prepare(sql).all(...params) as any[];

    // Format URLs
    const sessions = rows.map((r) => ({
      ...r,
      finalJpgUrl: r.final_jpg ? `/storage/sessions/${r.id}/final/${path.basename(r.final_jpg)}` : null,
      thumbnailUrl: r.thumbnail ? `/storage/sessions/${r.id}/final/${path.basename(r.thumbnail)}` : null
    }));

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          total: countRow.count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(countRow.count / limitNum)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/sessions/:id - Delete session data
adminRouter.delete('/sessions/:id', requireAdminAuth, (req, res, next) => {
  try {
    const db = getDatabase();
    const sessionId = req.params.id;

    // Delete files
    const dirs = getSessionDir(sessionId);
    if (fs.existsSync(dirs.root)) {
      fs.rmSync(dirs.root, { recursive: true, force: true });
    }

    // Delete database records (Cascades via Foreign Keys)
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);

    res.json({ success: true, message: 'Session and associated photos deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports - Analytics breakdown
adminRouter.get('/reports', requireAdminAuth, (req, res, next) => {
  try {
    const db = getDatabase();

    // Mode usage breakdown
    const modeUsage = db.prepare(`
      SELECT mode, COUNT(*) as count 
      FROM sessions 
      GROUP BY mode 
      ORDER BY count DESC
    `).all();

    // Last 14 days trend
    const dailyTrend = db.prepare(`
      SELECT SUBSTR(created_at, 1, 10) as date, COUNT(*) as sessionCount, SUM(print_count) as printCount
      FROM sessions
      GROUP BY date
      ORDER BY date DESC
      LIMIT 14
    `).all();

    // Template popularity
    const templatePopularity = db.prepare(`
      SELECT t.name_en, t.name_th, t.category, COUNT(s.id) as usageCount
      FROM templates t
      LEFT JOIN sessions s ON s.template_id = t.id
      GROUP BY t.id
      ORDER BY usageCount DESC
    `).all();

    res.json({
      success: true,
      data: {
        modeUsage,
        dailyTrend: dailyTrend.reverse(),
        templatePopularity
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/csv - Export CSV of sessions
adminRouter.get('/reports/csv', requireAdminAuth, (req, res, next) => {
  try {
    const db = getDatabase();
    const sessions = db.prepare(`
      SELECT s.id, s.session_code, s.mode, s.status, s.language, s.photo_count, s.print_count, s.created_at, s.completed_at
      FROM sessions s
      ORDER BY s.created_at DESC
    `).all() as any[];

    let csv = 'Session ID,Session Code,Mode,Status,Language,Photos,Prints,Created At,Completed At\n';
    for (const s of sessions) {
      csv += `"${s.id}","${s.session_code}","${s.mode}","${s.status}","${s.language}",${s.photo_count},${s.print_count},"${s.created_at}","${s.completed_at || ''}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="photobooth_report_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});
