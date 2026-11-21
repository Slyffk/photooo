import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { getDatabase } from '../config/database.js';
import { getSessionDir, STORAGE_ROOT } from '../config/paths.js';
import { broadcastEvent } from '../services/websocketService.js';
import { generateSessionGif } from '../services/gifService.js';
import { printerService } from '../services/printerService.js';
import {
  composePhoto,
  composePhotoStrip,
  composeSinglePhoto,
  composeCollage,
  composeGroupPhoto,
  type PhotoSlot,
  type PhotoEditOptions,
  type StickerOverlay,
  type TextOverlay
} from '../services/compositionService.js';

export const photoRouter = Router();

// POST /api/photos/upload - Save captured photo to session storage
photoRouter.post('/upload', async (req, res, next) => {
  try {
    const { sessionId, shotIndex, imageBase64, width = 1920, height = 1080 } = req.body;

    if (!sessionId || imageBase64 === undefined || shotIndex === undefined) {
      res.status(400).json({ success: false, message: 'Missing sessionId, shotIndex or imageBase64' });
      return;
    }

    const sessionDirs = getSessionDir(sessionId);
    const timestamp = Date.now();
    const filename = `shot_${shotIndex}_${timestamp}.jpg`;
    const filePath = path.join(sessionDirs.captured, filename);

    // Clean base64 header if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Save pristine original photo
    await sharp(buffer)
      .jpeg({ quality: 95 })
      .toFile(filePath);

    const db = getDatabase();
    const now = new Date().toISOString();

    const insertRes = db.prepare(`
      INSERT INTO captured_photos (session_id, shot_index, file_path, original_filename, width, height, is_selected, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(sessionId, shotIndex, filePath, filename, width, height, shotIndex, now);

    const photoId = Number(insertRes.lastInsertRowid);
    const savedPhoto = db.prepare('SELECT * FROM captured_photos WHERE id = ?').get(photoId);

    // Broadcast photo captured event
    broadcastEvent('photo_captured', {
      sessionId,
      photoId,
      shotIndex,
      filePath: `/storage/sessions/${sessionId}/captured/${filename}`
    });

    res.status(201).json({
      success: true,
      data: savedPhoto
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/photos/session/:sessionId - List captured photos
photoRouter.get('/session/:sessionId', (req, res, next) => {
  try {
    const db = getDatabase();
    const photos = db.prepare(`
      SELECT * FROM captured_photos 
      WHERE session_id = ? 
      ORDER BY sort_order ASC, shot_index ASC
    `).all(req.params.sessionId);

    res.json({
      success: true,
      data: photos
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/photos/:id - Delete a photo for retake
photoRouter.delete('/:id', (req, res, next) => {
  try {
    const db = getDatabase();
    const photo = db.prepare('SELECT * FROM captured_photos WHERE id = ?').get(req.params.id) as any;

    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo not found' });
      return;
    }

    if (fs.existsSync(photo.file_path)) {
      try {
        fs.unlinkSync(photo.file_path);
      } catch (e) {
        console.warn('Could not remove file:', e);
      }
    }

    db.prepare('DELETE FROM captured_photos WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/photos/reorder - Update order of photos
photoRouter.post('/reorder', (req, res, next) => {
  try {
    const { photoOrders } = req.body; // Array of { id: number, sortOrder: number }
    if (!Array.isArray(photoOrders)) {
      res.status(400).json({ success: false, message: 'photoOrders array required' });
      return;
    }

    const db = getDatabase();
    const updateStmt = db.prepare('UPDATE captured_photos SET sort_order = ? WHERE id = ?');

    for (const item of photoOrders) {
      updateStmt.run(item.sortOrder, item.id);
    }

    res.json({ success: true, message: 'Photos reordered' });
  } catch (err) {
    next(err);
  }
});

// POST /api/photos/compose - Compose final photo print image
photoRouter.post('/compose', async (req, res, next) => {
  try {
    const {
      sessionId,
      templateId,
      mode = 'strip',
      editOptions = {}, // global or per-slot
      stickers = [],
      textOverlays = [],
      brandText = 'HARU PHOTO BOOTH',
      slotAssignments,
      copies = 1,
      autoPrint = false
    } = req.body;

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId required' });
      return;
    }

    const db = getDatabase();
    const photos = db.prepare(`
      SELECT id, file_path FROM captured_photos 
      WHERE session_id = ? AND is_selected = 1
      ORDER BY sort_order ASC, shot_index ASC
    `).all(sessionId) as Array<{ id: number; file_path: string }>;

    if (photos.length === 0) {
      res.status(400).json({ success: false, message: 'No captured photos found for this session' });
      return;
    }

    let resolvedTemplateId = templateId;
    if (!resolvedTemplateId && sessionId) {
      const sRow = db.prepare('SELECT template_id FROM sessions WHERE id = ?').get(sessionId) as any;
      if (sRow?.template_id) {
        resolvedTemplateId = sRow.template_id;
      }
    }
    if (!resolvedTemplateId) {
      // Default to the first active template (template 1)
      const firstTpl = db.prepare('SELECT id FROM templates WHERE is_active = 1 LIMIT 1').get() as any;
      if (firstTpl) resolvedTemplateId = firstTpl.id;
    }

    let template: any = null;
    if (resolvedTemplateId) {
      template = db.prepare('SELECT * FROM templates WHERE id = ?').get(resolvedTemplateId);
    }

    const photosWithEdits = photos.map((p) => ({
      filePath: p.file_path,
      editOptions: editOptions as PhotoEditOptions
    }));

    let result;
    if (template && template.photo_slots_json) {
      let slots: PhotoSlot[] = [];
      try {
        slots = JSON.parse(template.photo_slots_json);
      } catch {
        slots = [];
      }

      // Apply customer's custom slot assignments if provided
      if (slotAssignments) {
        slots = slots.map((s, idx) => {
          let assignedIdx = s.shotIndex;
          if (Array.isArray(slotAssignments) && slotAssignments[idx] !== undefined) {
            assignedIdx = slotAssignments[idx];
          } else if (typeof slotAssignments === 'object' && slotAssignments[idx] !== undefined) {
            assignedIdx = slotAssignments[idx];
          }
          return { ...s, shotIndex: assignedIdx };
        });
      }

      let overlayPath: string | undefined = undefined;
      if (template.overlay_url) {
        const rel = template.overlay_url.replace(/^\/storage\//, '');
        overlayPath = path.join(STORAGE_ROOT, rel);
      }

      result = await composePhoto({
        sessionId,
        templateId: template.id,
        mode,
        canvasWidth: template.canvas_width || 726,
        canvasHeight: template.canvas_height || 1024,
        bgColor: template.bg_color || '#FFFFFF',
        borderColor: template.border_color || 'transparent',
        borderWidth: 0,
        slots,
        photos: photosWithEdits,
        brandText: template.overlay_url ? '' : brandText,
        dateText: template.overlay_url ? '' : undefined,
        stickers: stickers as StickerOverlay[],
        textOverlays: textOverlays as TextOverlay[],
        overlayImagePath: overlayPath,
        dpi: 300
      });
    } else {
      // Use specialized default mode compositions
      if (mode === 'single') {
        result = await composeSinglePhoto(sessionId, photosWithEdits[0], '#FAF9F6', brandText);
      } else if (mode === 'collage') {
        result = await composeCollage(sessionId, photosWithEdits, '#FAF9F6', brandText);
      } else if (mode === 'group') {
        result = await composeGroupPhoto(sessionId, photosWithEdits, '#FAF9F6', brandText);
      } else {
        // default vertical photo strip
        result = await composePhotoStrip(sessionId, photosWithEdits, 'vertical', '#FAF9F6', brandText);
      }
    }

    // Generate Animated Boomerang GIF in background
    let gifFilename = '';
    let gifUrl = '';
    try {
      const gifRes = await generateSessionGif(
        sessionId,
        photos.map((p) => p.file_path)
      );
      gifFilename = gifRes.filename;
      gifUrl = `/storage/sessions/${sessionId}/final/${gifFilename}`;
    } catch (e) {
      console.warn('GIF generation warning:', e);
    }

    const now = new Date().toISOString();

    // Store in final_photos table
    const insertRes = db.prepare(`
      INSERT INTO final_photos (session_id, template_id, final_jpg_path, final_png_path, thumbnail_path, width, height, dpi, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, templateId || null, result.jpgPath, result.pngPath, result.thumbnailPath, result.width, result.height, result.dpi, now);

    const finalPhotoId = Number(insertRes.lastInsertRowid);
    const record = db.prepare('SELECT * FROM final_photos WHERE id = ?').get(finalPhotoId) as any;

    // Auto-Print dispatch if enabled
    let printJobId: number | null = null;
    if (autoPrint) {
      try {
        const job = await printerService.submitPrintJob({
          sessionId,
          finalPhotoId,
          filePath: result.jpgPath,
          copies: Math.max(1, Math.min(4, copies)),
          paperSize: '4x6'
        });
        printJobId = job.jobId;
      } catch (err: any) {
        console.warn('Auto-print dispatch error:', err);
      }
    }

    // Broadcast composition complete
    broadcastEvent('processing_complete', {
      sessionId,
      finalPhotoId,
      previewUrl: `/storage/sessions/${sessionId}/final/${path.basename(result.jpgPath)}`,
      thumbnailUrl: `/storage/sessions/${sessionId}/final/${path.basename(result.thumbnailPath)}`,
      gifUrl
    });

    res.json({
      success: true,
      data: {
        id: finalPhotoId,
        sessionId,
        jpgUrl: `/storage/sessions/${sessionId}/final/${path.basename(result.jpgPath)}`,
        pngUrl: `/storage/sessions/${sessionId}/final/${path.basename(result.pngPath)}`,
        thumbnailUrl: `/storage/sessions/${sessionId}/final/${path.basename(result.thumbnailPath)}`,
        gifUrl: gifUrl || undefined,
        printJobId,
        width: result.width,
        height: result.height,
        dpi: result.dpi
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/photos/final/:sessionId - Get latest final photo for session
photoRouter.get('/final/:sessionId', (req, res, next) => {
  try {
    const db = getDatabase();
    const finalPhoto = db.prepare(`
      SELECT * FROM final_photos WHERE session_id = ? ORDER BY id DESC LIMIT 1
    `).get(req.params.sessionId) as any;

    if (!finalPhoto) {
      res.status(404).json({ success: false, message: 'Final photo not found for this session' });
      return;
    }

    let gifUrl: string | undefined = undefined;
    try {
      const sessionDirs = getSessionDir(finalPhoto.session_id);
      if (fs.existsSync(sessionDirs.final)) {
        const files = fs.readdirSync(sessionDirs.final);
        const gifFile = files.find((f) => f.endsWith('.gif'));
        if (gifFile) {
          gifUrl = `/storage/sessions/${finalPhoto.session_id}/final/${gifFile}`;
        }
      }
    } catch {}

    res.json({
      success: true,
      data: {
        ...finalPhoto,
        jpgUrl: `/storage/sessions/${finalPhoto.session_id}/final/${path.basename(finalPhoto.final_jpg_path)}`,
        pngUrl: `/storage/sessions/${finalPhoto.session_id}/final/${path.basename(finalPhoto.final_png_path)}`,
        thumbnailUrl: `/storage/sessions/${finalPhoto.session_id}/final/${path.basename(finalPhoto.thumbnail_path)}`,
        gifUrl
      }
    });
  } catch (err) {
    next(err);
  }
});
