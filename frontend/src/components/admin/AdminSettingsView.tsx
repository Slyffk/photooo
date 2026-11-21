import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import type { SystemSettings } from '../../types';
import { TouchButton } from '../common/TouchButton';

export const AdminSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({});
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getSettings()
      .then((res) => setSettings(res.settings))
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to save settings');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black text-korean-charcoal tracking-tight">
          System Settings & Configuration
        </h2>
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
          Branding, Timers, Hardware Defaults, and Network Configuration
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>System configuration updated successfully. Changes applied in real time.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft flex flex-col gap-5">
        {/* Business Branding */}
        <div className="border-b border-cream-200 pb-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-korean-charcoal mb-3">
            Branding & Appearance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">Business Name</label>
              <input
                type="text"
                value={settings.business_name || ''}
                onChange={(e) => handleChange('business_name', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-bold text-xs bg-cream-50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">Tagline</label>
              <input
                type="text"
                value={settings.business_tagline || ''}
                onChange={(e) => handleChange('business_tagline', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-bold text-xs bg-cream-50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Timers & Durations */}
        <div className="border-b border-cream-200 pb-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-korean-charcoal mb-3">
            Timers & Sequences
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">Countdown Duration (seconds)</label>
              <select
                value={settings.countdown_seconds || '5'}
                onChange={(e) => handleChange('countdown_seconds', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-bold text-xs bg-cream-50 focus:outline-none"
              >
                <option value="3">3 seconds</option>
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">Inactivity Timeout (seconds)</label>
              <input
                type="number"
                min="60"
                max="600"
                value={settings.session_timeout_seconds || '240'}
                onChange={(e) => handleChange('session_timeout_seconds', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-bold text-xs bg-cream-50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">Completion Timeout (seconds)</label>
              <input
                type="number"
                min="10"
                max="120"
                value={settings.completion_timeout_seconds || '30'}
                onChange={(e) => handleChange('completion_timeout_seconds', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-bold text-xs bg-cream-50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Storage & Privacy Retention */}
        <div className="border-b border-cream-200 pb-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-korean-charcoal mb-3">
            Storage & Privacy Retention
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">Local Image Retention (Days)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={settings.retention_days || '7'}
                onChange={(e) => handleChange('retention_days', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-bold text-xs bg-cream-50 focus:outline-none"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Photos older than this will be auto-purged from PC.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">QR Download Link Expiration (Hours)</label>
              <input
                type="number"
                min="1"
                max="168"
                value={settings.qr_expiration_hours || '24'}
                onChange={(e) => handleChange('qr_expiration_hours', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-bold text-xs bg-cream-50 focus:outline-none"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Customer mobile download link expires after this duration.</span>
            </div>
          </div>
        </div>

        {/* Network & QR Base URL */}
        <div className="pb-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-korean-charcoal mb-3">
            Network & QR Download Host
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">Kiosk LAN IP Address</label>
              <input
                type="text"
                value={settings.server_lan_ip || ''}
                onChange={(e) => handleChange('server_lan_ip', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono text-xs bg-cream-50 focus:outline-none"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Phones scanning QR code connect to this Wi-Fi IP address.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">Custom Public Base URL (Optional)</label>
              <input
                type="text"
                placeholder="https://photobooth.yourdomain.com"
                value={settings.custom_base_url || ''}
                onChange={(e) => handleChange('custom_base_url', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-mono text-xs bg-cream-50 focus:outline-none"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">If using ngrok or custom domain for cloud downloads.</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <TouchButton
            type="submit"
            variant="primary"
            size="md"
            icon={<Save className="w-4 h-4 text-korean-butter" />}
          >
            Save All Settings
          </TouchButton>
        </div>
      </form>
    </div>
  );
};
