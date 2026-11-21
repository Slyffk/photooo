import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Camera,
  Printer,
  HardDrive,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminDashboardView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <div className="p-8 text-center text-neutral-400 font-bold">Loading dashboard metrics...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-korean-charcoal tracking-tight">
            Dashboard Overview
          </h2>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
            Real-time Photo Booth Kiosk Health & Metrics
          </p>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Total Sessions</span>
            <div className="p-2.5 rounded-2xl bg-cream-100 text-korean-charcoal">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-korean-charcoal">{stats.totalSessions}</div>
          <div className="text-xs font-semibold text-neutral-500 mt-1">
            Today: <span className="text-emerald-600 font-bold">+{stats.todaySessions}</span> • This Month: {stats.monthlySessions}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Photos Captured</span>
            <div className="p-2.5 rounded-2xl bg-korean-pink/60 text-rose-800">
              <ImageIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-korean-charcoal">{stats.totalPhotos}</div>
          <div className="text-xs font-semibold text-neutral-500 mt-1">
            Preserved locally in high resolution
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Prints Dispatched</span>
            <div className="p-2.5 rounded-2xl bg-korean-mint/60 text-emerald-800">
              <Printer className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-korean-charcoal">{stats.totalPrints}</div>
          <div className="text-xs font-semibold text-neutral-500 mt-1">
            Windows Spooler verified prints
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-cream-200 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Top Photo Mode</span>
            <div className="p-2.5 rounded-2xl bg-korean-butter/60 text-amber-800">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-korean-charcoal capitalize">
            {stats.popularMode || 'Photo Strip'}
          </div>
          <div className="text-xs font-semibold text-neutral-500 mt-1">
            Most selected customer layout
          </div>
        </div>
      </div>

      {/* Hardware Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Camera Health */}
        <div className="bg-white p-5 rounded-3xl border border-cream-200 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-cream-100 text-korean-charcoal">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-korean-charcoal">Camera System</h4>
              <span className="text-xs font-semibold text-neutral-400">{stats.camera?.adapter}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
            <span>Status: {stats.camera?.status.toUpperCase()}</span>
          </div>
          <div className="text-xs text-neutral-500 mt-3 font-semibold">
            Supported: 1080p Full HD, 4K Ultra HD
          </div>
        </div>

        {/* Printer Health */}
        <div className="bg-white p-5 rounded-3xl border border-cream-200 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-cream-100 text-korean-charcoal">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-korean-charcoal">Print Engine</h4>
              <span className="text-xs font-semibold text-neutral-400 truncate block max-w-[180px]">
                {stats.printer?.defaultPrinter}
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl ${
            stats.printer?.status === 'ready' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
          }`}>
            {stats.printer?.status === 'ready' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>Status: {stats.printer?.status.toUpperCase()} ({stats.printer?.totalInstalled} Installed)</span>
          </div>
          <div className="text-xs text-neutral-500 mt-3 font-semibold">
            Paper: 4x6 / 2x6 Strip / A4
          </div>
        </div>

        {/* Storage Health */}
        <div className="bg-white p-5 rounded-3xl border border-cream-200 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-cream-100 text-korean-charcoal">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-korean-charcoal">Local Disk Storage</h4>
              <span className="text-xs font-semibold text-neutral-400">Sessions & Exports</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 bg-cream-100 px-3 py-2 rounded-xl">
            <Sparkles className="w-4 h-4 text-korean-butter" />
            <span>Used: {stats.storage?.usedMB} MB</span>
          </div>
          <div className="text-xs text-neutral-500 mt-3 font-semibold">
            Auto-retention cleanup active (7-day policy)
          </div>
        </div>
      </div>
    </div>
  );
};
