import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase } from '../config/database.js';

class TunnelService {
  private process: ChildProcess | null = null;
  private currentUrl: string = '';
  private isStarting: boolean = false;

  private getCloudflaredPath(): string {
    const projectRoot = path.resolve(__dirname, '../../..');
    return path.join(projectRoot, 'bin', 'cloudflared.exe');
  }

  private updateDatabaseSetting(url: string) {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO system_settings (key, value, description, updated_at)
        VALUES ('custom_base_url', ?, 'Cloudflare Tunnel 4G/5G Public URL', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(url, now);
    } catch (e) {
      console.warn('[TunnelService] Could not update system_settings:', e);
    }
  }

  public getTunnelUrl(): string {
    return this.currentUrl;
  }

  public isConnected(): boolean {
    return !!this.currentUrl && this.process !== null;
  }

  public startTunnel(port: number = 5000): Promise<string> {
    if (this.currentUrl && this.process) {
      return Promise.resolve(this.currentUrl);
    }

    if (this.isStarting) {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (this.currentUrl || !this.isStarting) {
            clearInterval(interval);
            resolve(this.currentUrl);
          }
        }, 500);
      });
    }

    this.isStarting = true;
    const exePath = this.getCloudflaredPath();

    if (!fs.existsSync(exePath)) {
      console.warn(`[TunnelService] cloudflared.exe not found at ${exePath}. Cloudflare tunnel disabled.`);
      this.isStarting = false;
      return Promise.resolve('');
    }

    return new Promise((resolve) => {
      try {
        console.log(`[TunnelService] 🌐 Starting Cloudflare Tunnel on port ${port}...`);
        this.process = spawn(exePath, ['tunnel', '--url', `http://127.0.0.1:${port}`], {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        const handleOutput = (data: Buffer) => {
          const text = data.toString();
          console.log(`[Cloudflared Log] ${text.trim()}`);
          
          const match = text.match(/https:\/\/([a-zA-Z0-9-]+)\.trycloudflare\.com/);
          if (match && match[1] !== 'api' && !this.currentUrl) {
            this.currentUrl = match[0];
            this.isStarting = false;
            this.updateDatabaseSetting(this.currentUrl);
            console.log(`[TunnelService] 🎉 Cloudflare Tunnel online! Public URL: ${this.currentUrl}`);
            resolve(this.currentUrl);
          }
        };

        this.process.stdout?.on('data', handleOutput);
        this.process.stderr?.on('data', handleOutput);

        this.process.on('close', (code) => {
          console.log(`[TunnelService] Tunnel process closed (code ${code})`);
          this.currentUrl = '';
          this.process = null;
          this.isStarting = false;
          this.updateDatabaseSetting('');
        });

        this.process.on('error', (err) => {
          console.warn('[TunnelService] Tunnel process error:', err.message);
          this.currentUrl = '';
          this.process = null;
          this.isStarting = false;
          this.updateDatabaseSetting('');
          resolve('');
        });

        // Timeout after 15 seconds if tunnel didn't report URL
        setTimeout(() => {
          if (this.isStarting) {
            this.isStarting = false;
            resolve(this.currentUrl);
          }
        }, 15000);
      } catch (err: any) {
        console.error('[TunnelService] Failed to spawn cloudflared:', err);
        this.isStarting = false;
        resolve('');
      }
    });
  }

  public stopTunnel() {
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch {}
      this.process = null;
    }
    this.currentUrl = '';
    this.updateDatabaseSetting('');
  }
}

export const tunnelService = new TunnelService();
