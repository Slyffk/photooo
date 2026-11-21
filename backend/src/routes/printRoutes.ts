import { Router } from 'express';
import { getDatabase } from '../config/database.js';
import { printerService } from '../services/printerService.js';
import { requireAdminAuth } from '../middleware/auth.js';

export const printRouter = Router();

// GET /api/print/printers - List detected Windows printers
printRouter.get('/printers', async (req, res, next) => {
  try {
    const printers = await printerService.getInstalledPrinters();
    const defaultPrinter = await printerService.getDefaultPrinter();

    res.json({
      success: true,
      data: {
        printers,
        defaultPrinter
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/print/submit - Submit customer print job
printRouter.post('/submit', async (req, res, next) => {
  try {
    const { sessionId, copies = 1, paperSize = '4x6', orientation = 'portrait', printerName } = req.body;

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId is required' });
      return;
    }

    const db = getDatabase();
    const finalPhoto = db.prepare(`
      SELECT id, final_jpg_path FROM final_photos 
      WHERE session_id = ? ORDER BY id DESC LIMIT 1
    `).get(sessionId) as { id: number; final_jpg_path: string } | undefined;

    if (!finalPhoto) {
      res.status(400).json({ success: false, message: 'No final photo found for this session to print.' });
      return;
    }

    const result = await printerService.submitPrintJob({
      sessionId,
      finalPhotoId: finalPhoto.id,
      filePath: finalPhoto.final_jpg_path,
      printerName,
      copies: parseInt(String(copies), 10) || 1,
      paperSize,
      orientation
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/print/status/:jobId - Query print job status
printRouter.get('/status/:jobId', (req, res, next) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    const job = printerService.getJobStatus(jobId);

    if (!job) {
      res.status(404).json({ success: false, message: 'Print job not found' });
      return;
    }

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
});

// POST /api/print/test - Admin test print
printRouter.post('/test', requireAdminAuth, async (req, res, next) => {
  try {
    const { printerName } = req.body;
    const result = await printerService.runTestPrint(printerName);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/print/reprint - Admin authorized reprint
printRouter.post('/reprint', requireAdminAuth, async (req, res, next) => {
  try {
    const { sessionId, copies = 1, printerName } = req.body;
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId is required' });
      return;
    }

    const db = getDatabase();
    const finalPhoto = db.prepare(`
      SELECT id, final_jpg_path FROM final_photos 
      WHERE session_id = ? ORDER BY id DESC LIMIT 1
    `).get(sessionId) as { id: number; final_jpg_path: string } | undefined;

    if (!finalPhoto) {
      res.status(404).json({ success: false, message: 'Final photo not found for session' });
      return;
    }

    const result = await printerService.submitPrintJob({
      sessionId,
      finalPhotoId: finalPhoto.id,
      filePath: finalPhoto.final_jpg_path,
      printerName,
      copies: parseInt(String(copies), 10) || 1
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/print/history - Admin print jobs list
printRouter.get('/history', requireAdminAuth, (req, res, next) => {
  try {
    const db = getDatabase();
    const jobs = db.prepare(`
      SELECT p.*, s.session_code, s.mode
      FROM print_jobs p
      LEFT JOIN sessions s ON p.session_id = s.id
      ORDER BY p.id DESC
      LIMIT 100
    `).all();

    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
});
