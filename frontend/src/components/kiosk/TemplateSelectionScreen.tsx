import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Printer, Plus, Minus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { TouchButton } from '../common/TouchButton';
import { api } from '../../services/api';
import type { Template, TemplateCategory } from '../../types';

export const TemplateSelectionScreen: React.FC = () => {
  const { t, language } = useLanguage();
  const { mode, confirmTemplate, setScreen, copies, setCopies } = useKiosk();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  const categories: Array<{ id: TemplateCategory; label: string }> = [
    { id: 'all', label: t.catAll },
    { id: 'minimal', label: t.catMinimal },
    { id: 'pastel', label: t.catPastel },
    { id: 'cute', label: t.catCute },
    { id: 'birthday', label: t.catBirthday },
    { id: 'anniversary', label: t.catAnniversary },
    { id: 'seasonal', label: t.catSeasonal }
  ];

  useEffect(() => {
    setLoading(true);
    api.getTemplates(selectedCategory === 'all' ? undefined : selectedCategory, true)
      .then((data) => {
        setTemplates(data);
        if (data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data[0]);
        }
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  const handleConfirm = () => {
    if (selectedTemplate) {
      confirmTemplate(selectedTemplate);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-8 py-6 max-w-6xl mx-auto w-full select-none animate-pop">
      {/* Title */}
      <div className="text-center mb-4">
        <h2 className="text-4xl font-black text-korean-charcoal tracking-tight">
          {t.templateTitle}
        </h2>
        <p className="text-lg text-neutral-500 font-medium mt-1">
          {t.templateSubtitle}
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-95 ${
              selectedCategory === cat.id
                ? 'bg-korean-charcoal text-white shadow-touch'
                : 'bg-white/80 hover:bg-white text-neutral-600 border border-cream-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates Cards Grid (6 Templates in 3x2 or responsive grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 my-auto max-h-[62vh] overflow-y-auto p-2">
        {templates.map((tpl) => {
          const isSelected = selectedTemplate?.id === tpl.id;

          return (
            <button
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl)}
              className={`relative flex flex-col items-center p-4 rounded-3xl border-3 transition-all duration-200 cursor-pointer text-center bg-white shadow-soft active:scale-95 ${
                isSelected
                  ? 'border-korean-charcoal shadow-glow ring-4 ring-korean-charcoal/10'
                  : 'border-cream-200 hover:border-cream-400'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-korean-charcoal text-white flex items-center justify-center shadow-touch z-10">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
              )}

              {/* Visual Template Image Card */}
              <div className="w-full h-64 rounded-2xl overflow-hidden bg-cream-50 mb-3 relative flex items-center justify-center border border-cream-200 shadow-inner">
                <img
                  src={tpl.thumbnail_url}
                  alt={tpl.name_en}
                  className="w-full h-full object-contain p-1"
                />
              </div>

              <div className="w-full">
                <h4 className="text-base font-black text-korean-charcoal line-clamp-1">
                  {language === 'th' ? tpl.name_th : tpl.name_en}
                </h4>
                <p className="text-xs font-semibold text-neutral-400 mt-0.5">
                  {language === 'th' ? tpl.name_en : tpl.name_th}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Navigation & Print Copies Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-3 pt-3 border-t border-cream-200">
        <TouchButton
          variant="secondary"
          size="md"
          onClick={() => setScreen('HOME')}
          icon={<ArrowLeft className="w-5 h-5" />}
        >
          {t.back}
        </TouchButton>

        {/* Print Copies Selector (1 - 4 copies) */}
        <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-2xl border-2 border-cream-200 shadow-soft">
          <div className="flex items-center gap-2 mr-2">
            <Printer className="w-5 h-5 text-korean-charcoal" />
            <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
              จำนวนพิมพ์ (Copies):
            </span>
          </div>

          <button
            onClick={() => setCopies(Math.max(1, copies - 1))}
            disabled={copies <= 1}
            className="w-10 h-10 rounded-xl bg-cream-100 hover:bg-cream-200 text-korean-charcoal flex items-center justify-center font-bold text-lg disabled:opacity-30 cursor-pointer active:scale-95 transition-all"
          >
            <Minus className="w-5 h-5" />
          </button>

          <span className="w-12 text-center text-xl font-black text-korean-charcoal">
            {copies} <span className="text-xs font-bold text-neutral-400">ใบ</span>
          </span>

          <button
            onClick={() => setCopies(Math.min(4, copies + 1))}
            disabled={copies >= 4}
            className="w-10 h-10 rounded-xl bg-cream-100 hover:bg-cream-200 text-korean-charcoal flex items-center justify-center font-bold text-lg disabled:opacity-30 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <TouchButton
          variant="primary"
          size="lg"
          onClick={handleConfirm}
          disabled={!selectedTemplate}
          icon={<ArrowRight className="w-5 h-5 text-korean-butter" />}
          className="px-8 shadow-touch"
        >
          {`ถัดไป: ไปถ่ายรูป (พิมพ์ ${copies} ใบ)`}
        </TouchButton>
      </div>
    </div>
  );
};
