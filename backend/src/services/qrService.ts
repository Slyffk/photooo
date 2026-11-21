import crypto from 'node:crypto';
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../config/database.js';
import { getLocalIpAddress } from '../database/seed.js';
import { getSessionDir } from '../config/paths.js';

export interface DownloadTokenInfo {
  token: string;
  sessionId: string;
  downloadUrl: string;
  qrDataUrl: string;
  expiresAt: string;
  downloadCount: number;
}

class QrDownloadService {
  /**
   * Determine the best base URL for QR codes that mobile phones can reach
   */
  getBaseUrl(): string {
    const db = getDatabase();

    // Check system_settings for custom public domain or base URL
    const customUrlRow = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('custom_base_url') as { value: string } | undefined;
    if (customUrlRow && customUrlRow.value.trim().length > 0) {
      return customUrlRow.value.trim().replace(/\/$/, '');
    }

    // Check configured LAN IP or auto-detect
    const lanIpRow = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('server_lan_ip') as { value: string } | undefined;
    const ip = (lanIpRow && lanIpRow.value) ? lanIpRow.value : getLocalIpAddress();

    const portRow = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('server_port') as { value: string } | undefined;
    const port = portRow ? portRow.value : '5000';

    return `http://${ip}:${port}`;
  }

  /**
   * Create or fetch a unique download token and generate QR code
   */
  async createDownloadToken(sessionId: string): Promise<DownloadTokenInfo> {
    const db = getDatabase();
    const now = new Date();

    const currentBaseUrl = this.getBaseUrl();

    // Check if an unexpired token already exists for this session
    const existing = db.prepare(`
      SELECT token, download_url, qr_data_url, expires_at, download_count
      FROM download_tokens
      WHERE session_id = ? AND expires_at > ?
      ORDER BY id DESC LIMIT 1
    `).get(sessionId, now.toISOString()) as any;

    if (existing) {
      // Check if existing token uses the current base URL
      if (existing.download_url && existing.download_url.startsWith(currentBaseUrl)) {
        return {
          token: existing.token,
          sessionId,
          downloadUrl: existing.download_url,
          qrDataUrl: existing.qr_data_url,
          expiresAt: existing.expires_at,
          downloadCount: existing.download_count
        };
      }

      // Base URL changed (e.g., tunnel connected or reset): regenerate QR with current base URL
      const updatedDownloadUrl = `${currentBaseUrl}/download/${existing.token}`;
      const updatedQrDataUrl = await QRCode.toDataURL(updatedDownloadUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 400,
        color: {
          dark: '#1A1A1A',
          light: '#FFFFFF'
        }
      });

      db.prepare(`
        UPDATE download_tokens
        SET download_url = ?, qr_data_url = ?
        WHERE token = ?
      `).run(updatedDownloadUrl, updatedQrDataUrl, existing.token);

      return {
        token: existing.token,
        sessionId,
        downloadUrl: updatedDownloadUrl,
        qrDataUrl: updatedQrDataUrl,
        expiresAt: existing.expires_at,
        downloadCount: existing.download_count
      };
    }

    // Read expiration hours from settings (default 24h)
    const expRow = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('qr_expiration_hours') as { value: string } | undefined;
    const expirationHours = expRow ? parseInt(expRow.value, 10) || 24 : 24;

    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000).toISOString();
    const token = crypto.randomBytes(16).toString('hex');
    const baseUrl = this.getBaseUrl();
    const downloadUrl = `${baseUrl}/download/${token}`;

    // Generate high-contrast, clean QR code Data URL (PNG)
    const qrDataUrl = await QRCode.toDataURL(downloadUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: {
        dark: '#1A1A1A',
        light: '#FFFFFF'
      }
    });

    db.prepare(`
      INSERT INTO download_tokens (session_id, token, download_url, qr_data_url, expires_at, download_count, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(sessionId, token, downloadUrl, qrDataUrl, expiresAt, now.toISOString());

    return {
      token,
      sessionId,
      downloadUrl,
      qrDataUrl,
      expiresAt,
      downloadCount: 0
    };
  }

  /**
   * Validate token and return session final photo details
   */
  validateToken(token: string): {
    valid: boolean;
    sessionId?: string;
    finalPhoto?: {
      jpgPath: string;
      pngPath: string;
      gifPath?: string;
      width: number;
      height: number;
      createdAt: string;
    };
    expiresAt?: string;
    message?: string;
  } {
    const db = getDatabase();
    const now = new Date().toISOString();

    const record = db.prepare(`
      SELECT t.session_id, t.expires_at, t.download_count,
             f.final_jpg_path, f.final_png_path, f.width, f.height, f.created_at
      FROM download_tokens t
      LEFT JOIN final_photos f ON t.session_id = f.session_id
      WHERE t.token = ?
    `).get(token) as any;

    if (!record) {
      return { valid: false, message: 'Invalid download link. Photo not found.' };
    }

    if (record.expires_at < now) {
      return { valid: false, message: 'This download link has expired for your privacy.' };
    }

    // Increment download count
    db.prepare('UPDATE download_tokens SET download_count = download_count + 1 WHERE token = ?').run(token);

    // Discover GIF file in session directory if available
    let gifPath: string | undefined = undefined;
    try {
      const sessionDirs = getSessionDir(record.session_id);
      if (fs.existsSync(sessionDirs.final)) {
        const files = fs.readdirSync(sessionDirs.final);
        const gifFile = files.find((f) => f.endsWith('.gif'));
        if (gifFile) {
          gifPath = path.join(sessionDirs.final, gifFile);
        }
      }
    } catch (e) {
      console.warn('Could not read GIF directory:', e);
    }

    return {
      valid: true,
      sessionId: record.session_id,
      finalPhoto: {
        jpgPath: record.final_jpg_path,
        pngPath: record.final_png_path,
        gifPath,
        width: record.width,
        height: record.height,
        createdAt: record.created_at
      },
      expiresAt: record.expires_at
    };
  }
}

export const qrService = new QrDownloadService();
