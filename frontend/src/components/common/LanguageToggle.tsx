import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-cream-200 shadow-soft">
      <button
        onClick={() => setLanguage('th')}
        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
          language === 'th'
            ? 'bg-korean-charcoal text-white shadow-touch'
            : 'text-neutral-500 hover:text-neutral-900'
        }`}
      >
        ไทย
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
          language === 'en'
            ? 'bg-korean-charcoal text-white shadow-touch'
            : 'text-neutral-500 hover:text-neutral-900'
        }`}
      >
        EN
      </button>
    </div>
  );
};
