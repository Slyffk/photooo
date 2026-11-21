import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, LayoutTemplate } from 'lucide-react';
import { api } from '../../services/api';
import type { Template } from '../../types';
import { TouchButton } from '../common/TouchButton';

export const AdminTemplatesView: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchTemplates = () => {
    setLoading(true);
    api.getTemplates(undefined, false)
      .then(setTemplates)
      .catch(console.warn)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleToggleActive = async (tpl: Template) => {
    try {
      await api.updateTemplate(tpl.id, { is_active: tpl.is_active ? 0 : 1 });
      fetchTemplates();
    } catch (err: any) {
      alert(err?.message || 'Toggle failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.deleteTemplate(id);
      fetchTemplates();
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      if (isCreating) {
        await api.createTemplate({
          ...editingTemplate,
          photo_slots_json: editingTemplate.photo_slots_json || JSON.stringify([
            { x: 40, y: 50, width: 520, height: 380, radius: 12 },
            { x: 40, y: 460, width: 520, height: 380, radius: 12 },
            { x: 40, y: 870, width: 520, height: 380, radius: 12 },
            { x: 40, y: 1280, width: 520, height: 380, radius: 12 }
          ]),
          thumbnail_url: editingTemplate.thumbnail_url || '/storage/templates/thumb_minimal.svg'
        });
      } else if (editingTemplate.id) {
        await api.updateTemplate(editingTemplate.id, editingTemplate);
      }
      setEditingTemplate(null);
      setIsCreating(false);
      fetchTemplates();
    } catch (err: any) {
      alert(err?.message || 'Save failed');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-korean-charcoal tracking-tight">
            Template Management
          </h2>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
            Configure frames, themes, categories and layouts
          </p>
        </div>

        <TouchButton
          variant="primary"
          size="sm"
          onClick={() => {
            setIsCreating(true);
            setEditingTemplate({
              name_en: 'New Studio Template',
              name_th: 'เทมเพลตใหม่',
              category: 'minimal',
              layout_type: 'strip_4_vertical',
              bg_color: '#FAF9F6',
              border_color: '#E8E3D9',
              is_active: 1
            });
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Template
        </TouchButton>
      </div>

      {/* Edit / Create Form Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-cream-200 animate-pop">
            <h3 className="text-lg font-black text-korean-charcoal mb-4">
              {isCreating ? 'Create New Template' : `Edit Template #${editingTemplate.id}`}
            </h3>

            <form onSubmit={handleSave} className="flex flex-col gap-3.5 text-xs font-bold text-neutral-700">
              <div>
                <label className="block uppercase text-[10px] text-neutral-400 mb-1">Name (English)</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.name_en || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name_en: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block uppercase text-[10px] text-neutral-400 mb-1">Name (Thai)</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.name_th || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name_th: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-[10px] text-neutral-400 mb-1">Category</label>
                  <select
                    value={editingTemplate.category || 'minimal'}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 font-semibold bg-white focus:outline-none"
                  >
                    <option value="minimal">Minimal</option>
                    <option value="pastel">Pastel</option>
                    <option value="cute">Cute</option>
                    <option value="birthday">Birthday</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase text-[10px] text-neutral-400 mb-1">Layout</label>
                  <select
                    value={editingTemplate.layout_type || 'strip_4_vertical'}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, layout_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 font-semibold bg-white focus:outline-none"
                  >
                    <option value="strip_4_vertical">Vertical Strip (4)</option>
                    <option value="single">Single Portrait</option>
                    <option value="collage_2x2">Collage (2x2)</option>
                    <option value="group">Group (3 Wide)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase text-[10px] text-neutral-400 mb-1">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingTemplate.bg_color || '#FAF9F6'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, bg_color: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-cream-300"
                    />
                    <input
                      type="text"
                      value={editingTemplate.bg_color || '#FAF9F6'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, bg_color: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-cream-300 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block uppercase text-[10px] text-neutral-400 mb-1">Border Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingTemplate.border_color || '#E8E3D9'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, border_color: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-cream-300"
                    />
                    <input
                      type="text"
                      value={editingTemplate.border_color || '#E8E3D9'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, border_color: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-cream-300 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setEditingTemplate(null); setIsCreating(false); }}
                  className="px-4 py-2 rounded-xl text-neutral-500 hover:bg-neutral-100 font-bold"
                >
                  Cancel
                </button>
                <TouchButton type="submit" variant="primary" size="sm">
                  Save Template
                </TouchButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className={`bg-white rounded-3xl p-5 border-2 transition-all shadow-soft flex flex-col justify-between ${
              tpl.is_active ? 'border-cream-200' : 'border-neutral-200 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cream-100 text-neutral-500">
                  {tpl.category}
                </span>

                <button
                  onClick={() => handleToggleActive(tpl)}
                  className={`flex items-center gap-1 text-xs font-bold cursor-pointer ${
                    tpl.is_active ? 'text-emerald-600' : 'text-neutral-400'
                  }`}
                >
                  {tpl.is_active ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Disabled</span>
                    </>
                  )}
                </button>
              </div>

              {/* Color swatch & Layout badge */}
              <div
                className="w-full h-28 rounded-2xl mb-3 flex items-center justify-center p-3 border shadow-inner"
                style={{ backgroundColor: tpl.bg_color, borderColor: tpl.border_color }}
              >
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="w-10 h-16 rounded-md bg-black/10 border border-black/5" />
                  ))}
                </div>
              </div>

              <h4 className="text-base font-black text-korean-charcoal">{tpl.name_en}</h4>
              <p className="text-xs font-semibold text-neutral-400">{tpl.name_th}</p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-3 border-t border-cream-200">
              <span className="text-[11px] font-mono text-neutral-400">Layout: {tpl.layout_type}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setIsCreating(false); setEditingTemplate(tpl); }}
                  className="p-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-neutral-700 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
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
