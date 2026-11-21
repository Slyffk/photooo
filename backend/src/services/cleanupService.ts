import fs from 'node:fs';
import { getDatabase } from '../config/database.js';
import { getSessionDir } from '../config/paths.js';

export function runRetentionCleanup(): { deletedSessions: number; freedRecords: number } {
  const db = getDatabase();

  const retentionRow = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('retention_days') as { value: string } | undefined;
  const days = retentionRow ? parseInt(retentionRow.value, 10) || 7 : 7;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Find expired sessions
  const oldSessions = db.prepare('SELECT id FROM sessions WHERE created_at < ?').all(cutoff) as Array<{ id: string }>;

  let deletedCount = 0;
  for (const session of oldSessions) {
    try {
      const sessionDirs = getSessionDir(session.id);
      if (fs.existsSync(sessionDirs.root)) {
        fs.rmSync(sessionDirs.root, { recursive: true, force: true });
      }
      deletedCount++;
    } catch (err) {
      console.warn(`Error deleting session directory ${session.id}:`, err);
    }
  }

  // Delete database records
  const result = db.prepare('DELETE FROM sessions WHERE created_at < ?').run(cutoff);

  return {
    deletedSessions: deletedCount,
    freedRecords: Number(result.changes)
  };
}

export function startCleanupSchedule(): void {
  // Run once on startup
  runRetentionCleanup();

  // Run every 6 hours
  setInterval(() => {
    try {
      const summary = runRetentionCleanup();
      if (summary.deletedSessions > 0) {
        console.log(`[Retention Cleanup] Purged ${summary.deletedSessions} old sessions.`);
      }
    } catch (err) {
      console.error('[Retention Cleanup] Error during scheduled cleanup:', err);
    }
  }, 6 * 60 * 60 * 1000);
}
