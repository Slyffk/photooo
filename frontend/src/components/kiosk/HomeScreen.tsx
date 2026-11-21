import React, { useEffect, useState } from 'react';
import { Camera, Printer, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { TouchButton } from '../common/TouchButton';
import { api } from '../../services/api';

export const HomeScreen: React.FC = () => {
  const { t } = useLanguage();
  const { startNewSession, isLoading } = useKiosk();
  const [cameraReady, setCameraReady] = useState(true);
  const [printerReady, setPrinterReady] = useState(true);

  useEffect(() => {
    // Check hardware readiness
    api.getCameraStatus()
      .then((res) => setCameraReady(res.status === 'ready'))
      .catch(() => setCameraReady(false));

    api.getPrinters()
      .then((res) => setPrinterReady(res.printers.length > 0))
      .catch(() => setPrinterReady(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-8 py-10 max-w-5xl mx-auto w-full select-none">
      {/* Brand Hero */}
      <div className="text-center my-auto flex flex-col items-center animate-pop">
        <div className="w-28 h-28 rounded-3xl bg-korean-charcoal text-white flex items-center justify-center shadow-glow mb-8 relative">
          <Sparkles className="w-14 h-14 text-korean-butter animate-pulse" />
          <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-cream-100 text-korean-charcoal text-[11px] font-black border border-cream-300 shadow-soft">
            KOREAN STUDIO
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-black text-korean-charcoal tracking-tight mb-4">
          {t.homeTitle}
        </h1>

        <p className="text-xl md:text-2xl text-neutral-500 font-medium max-w-2xl leading-relaxed mb-10">
          {t.homeSubtitle}
        </p>

        {/* Large Touch Start Button */}
        <TouchButton
          onClick={startNewSession}
          disabled={isLoading}
          size="xl"
          className="w-full max-w-md py-7 text-2xl tracking-wide gap-4 shadow-2xl active:scale-95 bg-korean-charcoal text-white hover:bg-neutral-800"
          icon={<ArrowRight className="w-8 h-8 text-korean-butter" />}
        >
          {isLoading ? t.loading : t.start}
        </TouchButton>

        <p className="text-sm font-semibold text-neutral-400 mt-5 tracking-wide animate-pulse-subtle">
          {t.homeTouchInstruction}
        </p>
      </div>

      {/* System Hardware Readiness Indicator */}
      <div className="w-full max-w-xl bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-cream-200 shadow-soft flex items-center justify-around text-sm font-semibold">
        {/* Camera Indicator */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${cameraReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400 uppercase tracking-wider">{t.systemStatusCamera}</div>
            <div className="flex items-center gap-1.5 text-neutral-800 font-bold">
              {cameraReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{t.systemStatusReady}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>{t.systemStatusOffline}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-cream-200" />

        {/* Printer Indicator */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${printerReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400 uppercase tracking-wider">{t.systemStatusPrinter}</div>
            <div className="flex items-center gap-1.5 text-neutral-800 font-bold">
              {printerReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{t.systemStatusReady}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>{t.systemStatusOffline}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
