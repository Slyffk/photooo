import React from 'react';
import { Sparkles, Shield, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { useAdmin } from '../../context/AdminContext';
import { LanguageToggle } from './LanguageToggle';

export const KioskHeader: React.FC = () => {
  const { t } = useLanguage();
  const { screen, session, resetToHome } = useKiosk();
  const { setIsAdminOpen } = useAdmin();

  return (
    <header className="w-full px-8 py-5 flex items-center justify-between select-none z-20">
      {/* Brand logo & tagline */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-korean-charcoal text-white flex items-center justify-center shadow-touch">
          <Sparkles className="w-6 h-6 text-korean-butter" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-wider text-korean-charcoal leading-none">
            {t.appName}
          </h1>
          <p className="text-xs font-medium text-neutral-400 tracking-widest uppercase mt-1">
            Photo Studio Kiosk
          </p>
        </div>
      </div>

      {/* Center status / Session info */}
      {session && screen !== 'HOME' && (
        <div className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-white/80 border border-cream-200 shadow-soft">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-neutral-400">SESSION:</span>
          <span className="text-sm font-extrabold text-korean-charcoal tracking-wider">
            {session.session_code}
          </span>
        </div>
      )}

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {screen !== 'HOME' && screen !== 'COMPLETE' && (
          <button
            onClick={resetToHome}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 hover:bg-white text-neutral-500 hover:text-neutral-800 border border-cream-200 shadow-soft text-sm font-semibold transition-all cursor-pointer active:scale-95"
            title="Reset Session"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">{t.cancel}</span>
          </button>
        )}

        <LanguageToggle />

        {/* Discreet Admin Login Gear */}
        <button
          onClick={() => setIsAdminOpen(true)}
          className="p-3 rounded-2xl bg-white/80 hover:bg-white text-neutral-400 hover:text-neutral-800 border border-cream-200 shadow-soft transition-all cursor-pointer active:scale-95"
          title={t.admin}
        >
          <Shield className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
