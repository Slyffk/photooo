import path from 'node:path';
import fs from 'node:fs';

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
export const STORAGE_ROOT = path.join(PROJECT_ROOT, 'storage');
export const SESSIONS_DIR = path.join(STORAGE_ROOT, 'sessions');
export const TEMPLATES_DIR = path.join(STORAGE_ROOT, 'templates');
export const LOGOS_DIR = path.join(STORAGE_ROOT, 'logos');
export const STICKERS_DIR = path.join(STORAGE_ROOT, 'stickers');
export const EXPORTS_DIR = path.join(STORAGE_ROOT, 'exports');
export const DATABASE_DIR = path.join(PROJECT_ROOT, 'database');
export const DATABASE_PATH = path.join(DATABASE_DIR, 'photobooth.sqlite');

// Ensure essential directories exist
[
  STORAGE_ROOT,
  SESSIONS_DIR,
  TEMPLATES_DIR,
  LOGOS_DIR,
  STICKERS_DIR,
  EXPORTS_DIR,
  DATABASE_DIR,
].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export function getSessionDir(sessionId: string): {
  root: string;
  captured: string;
  edited: string;
  final: string;
} {
  const root = path.join(SESSIONS_DIR, sessionId);
  const captured = path.join(root, 'captured');
  const edited = path.join(root, 'edited');
  const final = path.join(root, 'final');

  [root, captured, edited, final].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return { root, captured, edited, final };
}
