import React from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { KioskProvider, useKiosk } from './context/KioskContext';
import { AdminProvider } from './context/AdminContext';
import { KioskHeader } from './components/common/KioskHeader';
import { HomeScreen } from './components/kiosk/HomeScreen';
import { ModeSelectionScreen } from './components/kiosk/ModeSelectionScreen';
import { TemplateSelectionScreen } from './components/kiosk/TemplateSelectionScreen';
import { CameraCaptureScreen } from './components/kiosk/CameraCaptureScreen';
import { PhotoSelectionScreen } from './components/kiosk/PhotoSelectionScreen';
import { PhotoEditorScreen } from './components/kiosk/PhotoEditorScreen';
import { FinalPreviewScreen } from './components/kiosk/FinalPreviewScreen';
import { PrintAndDownloadScreen } from './components/kiosk/PrintAndDownloadScreen';
import { SessionCompleteScreen } from './components/kiosk/SessionCompleteScreen';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminLayout } from './components/admin/AdminLayout';
import { AlertCircle, X } from 'lucide-react';

const KioskApp: React.FC = () => {
  const { screen, error, setError } = useKiosk();

  return (
    <div className="relative w-screen h-screen flex flex-col bg-cream-50 overflow-hidden font-sans">
      {/* Kiosk Navigation Header */}
      <KioskHeader />

      {/* Global Error Banner */}
      {error && (
        <div className="mx-8 mt-2 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-soft z-30 animate-pop">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded-lg hover:bg-rose-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Screen Router */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {screen === 'HOME' && <HomeScreen />}
        {screen === 'MODE_SELECT' && <ModeSelectionScreen />}
        {screen === 'TEMPLATE_SELECT' && <TemplateSelectionScreen />}
        {screen === 'CAMERA' && <CameraCaptureScreen />}
        {screen === 'PHOTO_SELECT' && <PhotoSelectionScreen />}
        {screen === 'PHOTO_EDIT' && <PhotoEditorScreen />}
        {screen === 'FINAL_PREVIEW' && <FinalPreviewScreen />}
        {screen === 'PRINT_DOWNLOAD' && <PrintAndDownloadScreen />}
        {screen === 'COMPLETE' && <SessionCompleteScreen />}
      </main>

      {/* Admin Protected Modals */}
      <AdminLoginModal />
      <AdminLayout />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AdminProvider>
        <KioskProvider>
          <KioskApp />
        </KioskProvider>
      </AdminProvider>
    </LanguageProvider>
  );
};

export default App;
