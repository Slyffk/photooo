import React from 'react';
import { Columns3, Square, Grid2X2, Users2, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { TouchButton } from '../common/TouchButton';
import type { PhotoMode } from '../../types';

export const ModeSelectionScreen: React.FC = () => {
  const { t } = useLanguage();
  const { confirmMode, resetToHome } = useKiosk();

  const modes: Array<{
    id: PhotoMode;
    title: string;
    description: string;
    badge: string;
    icon: React.ReactNode;
    color: string;
    shotsCount: number;
  }> = [
    {
      id: 'strip',
      title: t.stripMode,
      description: t.stripDesc,
      badge: '4 SHOTS • CLASSIC',
      icon: <Columns3 className="w-12 h-12 text-korean-charcoal" />,
      color: 'bg-korean-butter/60 border-amber-200 hover:border-amber-400',
      shotsCount: 4
    },
    {
      id: 'single',
      title: t.singleMode,
      description: t.singleDesc,
      badge: '1 SHOT • PORTRAIT',
      icon: <Square className="w-12 h-12 text-korean-charcoal" />,
      color: 'bg-korean-mint/60 border-emerald-200 hover:border-emerald-400',
      shotsCount: 1
    },
    {
      id: 'collage',
      title: t.collageMode,
      description: t.collageDesc,
      badge: '4 SHOTS • 2x2 GRID',
      icon: <Grid2X2 className="w-12 h-12 text-korean-charcoal" />,
      color: 'bg-korean-lavender/60 border-purple-200 hover:border-purple-400',
      shotsCount: 4
    },
    {
      id: 'group',
      title: t.groupMode,
      description: t.groupDesc,
      badge: '3 SHOTS • WIDE ANGLE',
      icon: <Users2 className="w-12 h-12 text-korean-charcoal" />,
      color: 'bg-korean-pink/60 border-rose-200 hover:border-rose-400',
      shotsCount: 3
    }
  ];

  return (
    <div className="flex-1 flex flex-col justify-between px-8 py-6 max-w-6xl mx-auto w-full select-none animate-pop">
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-4xl font-black text-korean-charcoal tracking-tight">
          {t.modeTitle}
        </h2>
        <p className="text-lg text-neutral-500 font-medium mt-1">
          {t.modeSubtitle}
        </p>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
        {modes.map((item) => (
          <button
            key={item.id}
            onClick={() => confirmMode(item.id)}
            className={`flex items-start gap-6 p-7 rounded-3xl border-2 transition-all duration-200 text-left cursor-pointer active:scale-95 shadow-soft hover:shadow-touch ${item.color}`}
          >
            <div className="p-4 rounded-2xl bg-white/90 shadow-soft flex-shrink-0">
              {item.icon}
            </div>

            <div className="flex-1">
              <span className="inline-block px-3 py-1 rounded-full bg-white/80 text-korean-charcoal text-xs font-black tracking-wider uppercase mb-2">
                {item.badge}
              </span>
              <h3 className="text-2xl font-black text-korean-charcoal mb-2">
                {item.title}
              </h3>
              <p className="text-sm font-medium text-neutral-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-cream-200">
        <TouchButton
          variant="secondary"
          size="lg"
          onClick={resetToHome}
          icon={<ArrowLeft className="w-5 h-5" />}
        >
          {t.back}
        </TouchButton>
      </div>
    </div>
  );
};
