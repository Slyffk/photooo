import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { HOTFOLDER_DIR, getSessionDir } from '../config/paths.js';
import { getDatabase } from '../config/database.js';
import { broadcastEvent } from './websocketService.js';

interface FileCandidate {
  path: string;
  filename: string;
  size: number;
  lastChecked: number;
}

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.cr3', '.cr2', '.webp']);

class HotfolderService {
  private pollInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private trackedFiles: Map<string, FileCandidate> = new Map();

  startWatcher(intervalMs: number = 400): void {
    if (this.pollInterval) return;

    if (!fs.existsSync(HOTFOLDER_DIR)) {
      fs.mkdirSync(HOTFOLDER_DIR, { recursive: true });
    }

    console.log(`📷 [Hotfolder] Watching for Canon EOS shots in: ${HOTFOLDER_DIR}`);

    this.pollInterval = setInterval(() => {
      this.scanFolder().catch((err) => {
        console.error('[Hotfolder] Scan error:', err);
      });
    }, intervalMs);
  }

  stopWatcher(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  getStatus(): { watching: boolean; hotfolderDir: string; trackedCount: number } {
    return {
      watching: this.pollInterval !== null,
      hotfolderDir: HOTFOLDER_DIR,
      trackedCount: this.trackedFiles.size
    };
  }

  private async scanFolder(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      if (!fs.existsSync(HOTFOLDER_DIR)) {
        fs.mkdirSync(HOTFOLDER_DIR, { recursive: true });
        return;
      }

      const files = fs.readdirSync(HOTFOLDER_DIR);
      const now = Date.now();

      for (const filename of files) {
        // Skip hidden files, system files, and temporary files
        if (filename.startsWith('.') || filename.endsWith('.tmp') || filename.endsWith('.part')) {
          continue;
        }

        const ext = path.extname(filename).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.has(ext)) {
          continue;
        }

        const filePath = path.join(HOTFOLDER_DIR, filename);

        let stats: fs.Stats;
        try {
          stats = fs.statSync(filePath);
        } catch {
          // File may have been moved or removed
          continue;
        }

        if (!stats.isFile() || stats.size === 0) {
          continue;
        }

        const existing = this.trackedFiles.get(filePath);

        // If newly discovered, track size and wait one tick to confirm file transfer is complete
        if (!existing) {
          this.trackedFiles.set(filePath, {
            path: filePath,
            filename,
            size: stats.size,
            lastChecked: now
          });
          continue;
        }

        // If file is still growing (Canon EOS Utility still writing), update tracked size
        if (stats.size !== existing.size) {
          existing.size = stats.size;
          existing.lastChecked = now;
          continue;
        }

        // File size is stable and has stabilized for at least 250ms
        if (now - existing.lastChecked >= 250) {
          // Try to acquire file by opening it
          let fd: number | null = null;
          try {
            fd = fs.openSync(filePath, 'r');
          } catch {
            // Still locked by EOS Utility
            continue;
          } finally {
            if (fd !== null) {
              try { fs.closeSync(fd); } catch {}
            }
          }

          // Process and ingest this stable photo
          this.trackedFiles.delete(filePath);
          await this.ingestPhoto(filePath, filename);
        }
      }

      // Cleanup trackedFiles that no longer exist
      for (const trackedPath of Array.from(this.trackedFiles.keys())) {
        if (!fs.existsSync(trackedPath)) {
          this.trackedFiles.delete(trackedPath);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async ingestPhoto(sourcePath: string, originalFilename: string): Promise<void> {
    const db = getDatabase();

    // 1. Find active session
    const kiosk = db.prepare('SELECT active_session_id FROM kiosks WHERE id = 1').get() as { active_session_id?: string } | undefined;
    let session: any = null;

    if (kiosk?.active_session_id) {
      session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(kiosk.active_session_id);
    }

    if (!session || session.status === 'completed') {
      session = db.prepare("SELECT * FROM sessions WHERE status IN ('created', 'active') ORDER BY created_at DESC LIMIT 1").get();
    }

    if (!session) {
      console.warn(`[Hotfolder] Photo received (${originalFilename}) but no active session found. Keeping in hotfolder.`);
      return;
    }

    // 2. Determine shot index (find lowest available index 1..totalShots)
    const existingShots = db.prepare('SELECT shot_index FROM captured_photos WHERE session_id = ?').all(session.id) as { shot_index: number }[];
    const existingIndices = new Set(existingShots.map((s) => s.shot_index));
    let shotIndex = 1;
    while (existingIndices.has(shotIndex)) {
      shotIndex++;
    }

    const sessionDirs = getSessionDir(session.id);
    const timestamp = Date.now();
    const destFilename = `shot_${shotIndex}_${timestamp}.jpg`;
    const destPath = path.join(sessionDirs.captured, destFilename);

    console.log(`[Hotfolder] Processing Canon shot -> Session ${session.session_code}, Shot #${shotIndex}...`);

    try {
      // 3. Process with Sharp: auto-orient via EXIF, save pristine high-res JPEG
      const imageInstance = sharp(sourcePath).rotate();
      const metadata = await imageInstance.metadata();

      await imageInstance
        .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
        .toFile(destPath);

      // Generate lightweight base64 thumbnail for instant preview in touchscreen kiosk
      const thumbBuffer = await sharp(destPath)
        .resize({ width: 720, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      const dataUrl = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;

      // 4. Remove original from hotfolder to prevent reprocessing
      try {
        fs.unlinkSync(sourcePath);
      } catch (err) {
        console.warn(`[Hotfolder] Could not remove source file ${sourcePath}:`, err);
      }

      // 5. Insert into SQLite
      const now = new Date().toISOString();
      const insertRes = db.prepare(`
        INSERT INTO captured_photos (session_id, shot_index, file_path, original_filename, width, height, is_selected, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        session.id,
        shotIndex,
        destPath,
        originalFilename,
        metadata.width || 1920,
        metadata.height || 1080,
        shotIndex,
        now
      );

      const photoId = Number(insertRes.lastInsertRowid);

      // Update session status to active if was created
      if (session.status === 'created') {
        db.prepare("UPDATE sessions SET status = 'active', updated_at = ? WHERE id = ?").run(now, session.id);
      }

      console.log(`📸 [Hotfolder] Shot #${shotIndex} captured and saved successfully! (${metadata.width}x${metadata.height})`);

      // 6. Broadcast WebSocket event to all connected kiosks
      broadcastEvent('photo_captured', {
        sessionId: session.id,
        photoId,
        shotIndex,
        filePath: `/storage/sessions/${session.id}/captured/${destFilename}`,
        dataUrl,
        width: metadata.width || 1920,
        height: metadata.height || 1080,
        totalShots: session.photo_count || 4,
        source: 'canon_eos'
      });
    } catch (err) {
      console.error(`[Hotfolder] Failed to ingest image ${sourcePath}:`, err);
    }
  }
}

export const hotfolderService = new HotfolderService();
