import React from 'react';
import { ArrowLeft, ArrowRight, Printer, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { TouchButton } from '../common/TouchButton';

export const FinalPreviewScreen: React.FC = () => {
  const { t } = useLanguage();
  const { finalPhoto, setScreen } = useKiosk();

  if (!finalPhoto) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-lg font-bold text-neutral-500 mb-4">{t.loading}</p>
        <TouchButton onClick={() => setScreen('PHOTO_EDIT')}>{t.back}</TouchButton>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-4 max-w-6xl mx-auto w-full select-none animate-pop">
      {/* Title */}
      <div className="text-center mb-3">
        <h2 className="text-3xl font-black text-korean-charcoal tracking-tight">
          {t.previewTitle}
        </h2>
        <p className="text-sm text-neutral-500 font-medium">
          {t.previewSubtitle}
        </p>
      </div>

      {/* High-Resolution Photo Composition View */}
      <div className="flex-1 flex items-center justify-center my-auto p-4 overflow-hidden">
        <div className="relative bg-white p-3 rounded-3xl shadow-2xl border-4 border-white max-h-[62vh] flex items-center justify-center">
          <img
            src={finalPhoto.jpgUrl}
            alt="Final Photobooth Strip"
            className="max-h-[58vh] max-w-full object-contain rounded-2xl shadow-touch"
          />

          <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-black tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-korean-butter" />
            <span>300 DPI HI-RES</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-cream-200">
        <TouchButton
          variant="secondary"
          size="lg"
          onClick={() => setScreen('PHOTO_EDIT')}
          icon={<ArrowLeft className="w-5 h-5" />}
        >
          {t.editAgain}
        </TouchButton>

        <TouchButton
          variant="primary"
          size="lg"
          onClick={() => setScreen('PRINT_DOWNLOAD')}
          icon={<Printer className="w-5 h-5 text-korean-butter" />}
        >
          {t.proceedToPrint}
        </TouchButton>
      </div>
    </div>
  );
};
