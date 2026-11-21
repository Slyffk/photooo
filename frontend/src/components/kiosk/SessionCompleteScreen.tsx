import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Heart, Home, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { TouchButton } from '../common/TouchButton';

export const SessionCompleteScreen: React.FC = () => {
  const { t } = useLanguage();
  const { resetToHome } = useKiosk();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);

  // Trigger celebration confetti
  useEffect(() => {
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFE4E1', '#E6E6FA', '#FFF8DC', '#E0F2E9', '#1A1A1A']
      });
    } catch {
      // ignore
    }

    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          resetToHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resetToHome]);

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-8 py-12 max-w-4xl mx-auto w-full select-none text-center animate-pop">
      <div className="flex-1 flex flex-col items-center justify-center my-auto">
        {/* Heart Icon Circle */}
        <div className="w-28 h-28 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shadow-glow mb-8 animate-bounce">
          <Heart className="w-14 h-14 fill-rose-500 text-rose-500" />
        </div>

        <h2 className="text-5xl font-black text-korean-charcoal tracking-tight mb-4">
          {t.completeTitle}
        </h2>

        <p className="text-xl text-neutral-500 font-medium max-w-xl leading-relaxed mb-8">
          {t.completeSubtitle}
        </p>

        {/* Security & Privacy Notice */}
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cream-100 text-neutral-600 text-xs font-bold border border-cream-200 mb-8 shadow-soft">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{t.cleanSessionNotice}</span>
        </div>

        {/* Return to Home Touch Button */}
        <TouchButton
          variant="primary"
          size="xl"
          onClick={resetToHome}
          className="px-10 py-5 text-xl tracking-wide gap-3 shadow-touch bg-korean-charcoal text-white hover:bg-neutral-800"
          icon={<Home className="w-6 h-6 text-korean-butter" />}
        >
          {t.returnHomeNow}
        </TouchButton>

        <p className="text-sm font-bold text-neutral-400 mt-6 tracking-wide">
          {t.autoReturnNotice.replace('{seconds}', String(secondsRemaining))}
        </p>
      </div>

      <div className="text-xs font-bold uppercase tracking-widest text-neutral-300">
        HARU PHOTO BOOTH • SELF SERVICE KIOSK
      </div>
    </div>
  );
};
