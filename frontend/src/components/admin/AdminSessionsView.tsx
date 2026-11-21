import React, { useState, useEffect } from 'react';
import { Search, Printer, Trash2, Eye, RefreshCw, X } from 'lucide-react';
import { api } from '../../services/api';
import { TouchButton } from '../common/TouchButton';

export const AdminSessionsView: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [reprintMessage, setReprintMessage] = useState<string | null>(null);

  const fetchSessions = (page = 1) => {
    setLoading(true);
    api.getAdminSessions({ search, mode: modeFilter, page, limit: 15 })
      .then((res) => {
        setSessions(res.sessions);
        setPagination(res.pagination);
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions(1);
  }, [modeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSessions(1);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete session ${id}? All local photos will be permanently removed.`)) return;

    try {
      await api.deleteAdminSession(id);
      fetchSessions(pagination.page);
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  };

  const handleReprint = async (sessionId: string) => {
    try {
      setReprintMessage('Submitting reprint to Windows spooler...');
      await api.reprintSession(sessionId, 1);
      setReprintMessage('Reprint job successfully spooled!');
      setTimeout(() => setReprintMessage(null), 3000);
      fetchSessions(pagination.page);
    } catch (err: any) {
      setReprintMessage(`Reprint error: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Photo Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-4 max-w-lg w-full relative flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
            >
              <X className="w-5 h-5 text-neutral-600" />
            </button>
            <h4 className="text-base font-bold text-neutral-700 mb-3">Final Photo Composition</h4>
            <img src={previewImage} alt="Composition" className="max-h-[70vh] rounded-2xl shadow-touch object-contain" />
          </div>
        </div>
      )}

      {/* Top Bar with Search & Mode Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-korean-charcoal tracking-tight">
            Session History
          </h2>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
            Total {pagination.total} Customer Photo Sessions Recorded
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Mode Filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-cream-300 font-bold text-xs bg-white focus:outline-none"
          >
            <option value="">All Modes</option>
            <option value="strip">Photo Strip</option>
            <option value="single">Single Portrait</option>
            <option value="collage">2x2 Collage</option>
            <option value="group">Group Photo</option>
          </select>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              placeholder="Search Code / ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-2xl border border-cream-300 font-bold text-xs bg-white focus:outline-none w-48 sm:w-60"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
          </form>

          <button
            onClick={() => fetchSessions(pagination.page)}
            className="p-2.5 rounded-2xl bg-white border border-cream-200 shadow-soft text-neutral-600 hover:text-neutral-900 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {reprintMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold">
          {reprintMessage}
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-neutral-700">
            <thead className="bg-cream-100/70 uppercase text-[10px] tracking-wider text-neutral-400 border-b border-cream-200">
              <tr>
                <th className="px-5 py-4">Session Code</th>
                <th className="px-5 py-4">Mode</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Shots</th>
                <th className="px-5 py-4">Prints</th>
                <th className="px-5 py-4">Preview</th>
                <th className="px-5 py-4">Created Date</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-neutral-400 font-bold">
                    No sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-cream-50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-korean-charcoal">
                      {s.session_code}
                    </td>
                    <td className="px-5 py-4 capitalize font-bold">
                      {s.mode}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        s.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'cancelled'
                          ? 'bg-neutral-100 text-neutral-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold">{s.photo_shots}</td>
                    <td className="px-5 py-4 font-bold">{s.print_count}</td>
                    <td className="px-5 py-4">
                      {s.thumbnailUrl || s.finalJpgUrl ? (
                        <button
                          onClick={() => setPreviewImage(s.finalJpgUrl || s.thumbnailUrl)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-neutral-800 font-bold cursor-pointer text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-neutral-300">No output</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-neutral-500 font-medium">
                      {new Date(s.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.finalJpgUrl && (
                          <button
                            onClick={() => handleReprint(s.id)}
                            className="p-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-neutral-800 cursor-pointer active:scale-95"
                            title="Reprint Session"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer active:scale-95"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-cream-200 bg-cream-50/50">
            <span className="text-xs text-neutral-400 font-semibold">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSessions(pagination.page - 1)}
                className="px-3 py-1.5 rounded-xl bg-white border border-cream-200 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchSessions(pagination.page + 1)}
                className="px-3 py-1.5 rounded-xl bg-white border border-cream-200 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
