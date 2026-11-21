import React, { useState, useEffect } from 'react';
import { Package as PackageIcon, CheckCircle2, XCircle, Edit2, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import type { Package } from '../../types';
import { TouchButton } from '../common/TouchButton';

export const AdminPackagesView: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Partial<Package> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchPackages = () => {
    setLoading(true);
    api.getPackages(false)
      .then(setPackages)
      .catch(console.warn)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleToggleActive = async (pkg: Package) => {
    try {
      await api.updatePackage(pkg.id, { is_active: pkg.is_active ? 0 : 1 });
      fetchPackages();
    } catch (err: any) {
      alert(err?.message || 'Toggle failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this service package?')) return;
    try {
      await api.deletePackage(id);
      fetchPackages();
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;

    try {
      if (isCreating) {
        await api.createPackage(editingPackage);
      } else if (editingPackage.id) {
        await api.updatePackage(editingPackage.id, editingPackage);
      }
      setEditingPackage(null);
      setIsCreating(false);
      fetchPackages();
    } catch (err: any) {
      alert(err?.message || 'Save failed');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-korean-charcoal tracking-tight">
            Service Package Management
          </h2>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
            Organize customer photo modes and shot capacities (Non-payment workflow)
          </p>
        </div>

        <TouchButton
          variant="primary"
          size="sm"
          onClick={() => {
            setIsCreating(true);
            setEditingPackage({
              name_en: 'New Photo Package',
              name_th: 'แพ็กเกจใหม่',
              description_en: 'Standard photoshoot package',
              description_th: 'แพ็กเกจถ่ายภาพมาตรฐาน',
              mode: 'strip',
              photo_count: 4,
              display_order: 5,
              is_active: 1
            });
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Package
        </TouchButton>
      </div>

      {/* Edit / Create Modal */}
      {editingPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-cream-200 animate-pop">
            <h3 className="text-lg font-black text-korean-charcoal mb-4">
              {isCreating ? 'Create Service Package' : `Edit Package #${editingPackage.id}`}
            </h3>

            <form onSubmit={handleSave} className="flex flex-col gap-3 text-xs font-bold text-neutral-700">
              <div>
                <label className="block uppercase text-[10px] text-neutral-400 mb-1">Package Name (EN)</label>
                <input
                  type="text"
                  required
                  value={editingPackage.name_en || ''}
                  onChange={(e) => setEditingPackage({ ...editingPackage, name_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block uppercase text-[10px] text-neutral-400 mb-1">Package Name (TH)</label>
                <input
                  type="text"
                  required
                  value={editingPackage.name_th || ''}
                  onChange={(e) => setEditingPackage({ ...editingPackage, name_th: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-[10px] text-neutral-400 mb-1">Photo Mode</label>
                  <select
                    value={editingPackage.mode || 'strip'}
                    onChange={(e) => setEditingPackage({ ...editingPackage, mode: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 font-semibold bg-white focus:outline-none"
                  >
                    <option value="strip">Photo Strip</option>
                    <option value="single">Single Photo</option>
                    <option value="collage">Collage (2x2)</option>
                    <option value="group">Group Photo</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase text-[10px] text-neutral-400 mb-1">Number of Photos</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={editingPackage.photo_count || 4}
                    onChange={(e) => setEditingPackage({ ...editingPackage, photo_count: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setEditingPackage(null); setIsCreating(false); }}
                  className="px-4 py-2 rounded-xl text-neutral-500 hover:bg-neutral-100 font-bold"
                >
                  Cancel
                </button>
                <TouchButton type="submit" variant="primary" size="sm">
                  Save
                </TouchButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Packages List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-white rounded-3xl p-5 border-2 shadow-soft flex items-start justify-between ${
              pkg.is_active ? 'border-cream-200' : 'border-neutral-200 opacity-60'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-cream-100 text-korean-charcoal">
                <PackageIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cream-100 text-neutral-500">
                  {pkg.mode} • {pkg.photo_count} SHOTS
                </span>
                <h4 className="text-lg font-black text-korean-charcoal mt-1">{pkg.name_en}</h4>
                <p className="text-xs font-semibold text-neutral-500">{pkg.name_th}</p>
                <p className="text-xs text-neutral-400 mt-2 max-w-sm">{pkg.description_en}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <button
                onClick={() => handleToggleActive(pkg)}
                className={`flex items-center gap-1 text-xs font-bold cursor-pointer ${
                  pkg.is_active ? 'text-emerald-600' : 'text-neutral-400'
                }`}
              >
                {pkg.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>{pkg.is_active ? 'Active' : 'Disabled'}</span>
              </button>

              <div className="flex items-center gap-1.5 mt-4">
                <button
                  onClick={() => { setIsCreating(false); setEditingPackage(pkg); }}
                  className="p-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-neutral-700 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
