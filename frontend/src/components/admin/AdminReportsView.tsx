import React, { useState, useEffect } from 'react';
import { Download, BarChart2, TrendingUp, Calendar, Layers } from 'lucide-react';
import { api } from '../../services/api';
import { TouchButton } from '../common/TouchButton';

export const AdminReportsView: React.FC = () => {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminReports()
      .then(setReports)
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = () => {
    const token = localStorage.getItem('haru_admin_token') || '';
    window.open(`/api/admin/reports/csv?token=${token}`, '_blank');
  };

  if (loading || !reports) {
    return <div className="p-8 text-center text-neutral-400 font-bold">Loading analytics reports...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-korean-charcoal tracking-tight">
            Analytics & Reports
          </h2>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
            Customer Trends, Photo Mode Popularity, and CSV Export
          </p>
        </div>

        <TouchButton
          variant="primary"
          size="sm"
          onClick={handleExportCsv}
          icon={<Download className="w-4 h-4 text-korean-butter" />}
        >
          Export CSV Report
        </TouchButton>
      </div>

      {/* Mode Distribution & Template Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo Mode Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-cream-100 text-korean-charcoal">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-korean-charcoal">Photo Mode Usage</h3>
              <span className="text-xs text-neutral-400 font-bold">Breakdown by Layout</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {reports.modeUsage.map((m: any) => (
              <div key={m.mode} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold text-neutral-700 capitalize">
                  <span>{m.mode}</span>
                  <span>{m.count} sessions</span>
                </div>
                <div className="w-full h-3 rounded-full bg-cream-100 overflow-hidden">
                  <div
                    className="h-full bg-korean-charcoal rounded-full"
                    style={{ width: `${Math.min(100, (m.count / (reports.dailyTrend.reduce((acc: number, curr: any) => acc + curr.sessionCount, 0) || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Template Popularity */}
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-cream-100 text-korean-charcoal">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-korean-charcoal">Top Templates</h3>
              <span className="text-xs text-neutral-400 font-bold">Most chosen designs</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto">
            {reports.templatePopularity.map((t: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-2xl bg-cream-50 text-xs font-bold"
              >
                <div>
                  <span className="text-korean-charcoal block">{t.name_en}</span>
                  <span className="text-[10px] text-neutral-400 font-semibold">{t.category}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cream-200 text-korean-charcoal font-black text-[11px]">
                  {t.usageCount} uses
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Sessions & Prints Breakdown Table */}
      <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-cream-100 text-korean-charcoal">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-korean-charcoal">Recent Activity Trend (Last 14 Days)</h3>
            <span className="text-xs text-neutral-400 font-bold">Daily completed sessions & prints</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-neutral-700">
            <thead className="bg-cream-100/70 uppercase text-[10px] tracking-wider text-neutral-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Completed Sessions</th>
                <th className="px-4 py-3">Prints Dispatched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {reports.dailyTrend.map((d: any) => (
                <tr key={d.date} className="hover:bg-cream-50">
                  <td className="px-4 py-3 font-mono font-bold">{d.date}</td>
                  <td className="px-4 py-3 font-black text-korean-charcoal">{d.sessionCount}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{d.printCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
