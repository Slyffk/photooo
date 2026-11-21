import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  PhotoMode,
  Template,
  CapturedPhoto,
  FinalPhoto,
  PhotoEditState,
  StickerItem,
  TextOverlayItem,
  Session,
  PrintJob
} from '../types';
import { api } from '../services/api';
import { useLanguage } from './LanguageContext';
import { wsClient } from '../services/websocket';

export type KioskScreen =
  | 'HOME'
  | 'MODE_SELECT'
  | 'TEMPLATE_SELECT'
  | 'CAMERA'
  | 'PHOTO_SELECT'
  | 'PHOTO_EDIT'
  | 'FINAL_PREVIEW'
  | 'PRINT_DOWNLOAD'
  | 'COMPLETE';

interface KioskContextType {
  screen: KioskScreen;
  setScreen: (screen: KioskScreen) => void;
  session: Session | null;
  mode: PhotoMode;
  setMode: (mode: PhotoMode) => void;
  template: Template | null;
  setTemplate: (tpl: Template | null) => void;
  capturedPhotos: CapturedPhoto[];
  finalPhoto: FinalPhoto | null;
  editState: PhotoEditState;
  setEditState: React.Dispatch<React.SetStateAction<PhotoEditState>>;
  stickers: StickerItem[];
  setStickers: React.Dispatch<React.SetStateAction<StickerItem[]>>;
  textOverlays: TextOverlayItem[];
  setTextOverlays: React.Dispatch<React.SetStateAction<TextOverlayItem[]>>;
  copies: number;
  setCopies: (num: number) => void;
  slotAssignments: number[];
  setSlotAssignments: React.Dispatch<React.SetStateAction<number[]>>;
  isLoading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  // Session Actions
  startNewSession: () => Promise<void>;
  confirmMode: (mode: PhotoMode) => Promise<void>;
  confirmTemplate: (tpl: Template) => Promise<void>;
  addCapturedPhoto: (shotIndex: number, imageBase64: string) => Promise<CapturedPhoto>;
  retakeSingleShot: (photoId: number) => Promise<void>;
  retakeAllShots: () => Promise<void>;
  reorderCapturedPhotos: (fromIndex: number, toIndex: number) => void;
  composeFinalPhoto: () => Promise<void>;
  resetToHome: () => void;
}

const defaultEditState: PhotoEditState = {
  filter: 'original',
  brightness: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  rotation: 0
};

const KioskContext = createContext<KioskContextType | undefined>(undefined);

export const KioskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const [screen, setScreen] = useState<KioskScreen>('HOME');
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<PhotoMode>('strip');
  const [template, setTemplate] = useState<Template | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [finalPhoto, setFinalPhoto] = useState<FinalPhoto | null>(null);
  const [editState, setEditState] = useState<PhotoEditState>(defaultEditState);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlayItem[]>([]);
  const [copies, setCopies] = useState<number>(1);
  const [slotAssignments, setSlotAssignments] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inactivity timeout reference
  const idleTimerRef = useRef<number | null>(null);

  // Reset inactivity timer on touch/click
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }
    // Only timeout if in mid-session (not HOME)
    if (screen !== 'HOME') {
      idleTimerRef.current = window.setTimeout(() => {
        console.log('Session timed out due to customer inactivity');
        resetToHome();
      }, 180 * 1000); // 3 minutes timeout
    }
  }, [screen]);

  useEffect(() => {
    const handleUserActivity = () => resetIdleTimer();
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    return () => {
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Connect WebSocket for live events
  useEffect(() => {
    wsClient.connect();
  }, []);

  // 1. Start new session - goes directly to Template Selection
  const startNewSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await api.createSession('strip', language, 4);
      setSession(newSession);
      setCapturedPhotos([]);
      setFinalPhoto(null);
      setEditState(defaultEditState);
      setStickers([]);
      setTextOverlays([]);
      setCopies(1);
      setSlotAssignments([]);
      setScreen('TEMPLATE_SELECT');
    } catch (err: any) {
      setError(err?.message || 'Could not start new session');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Select & confirm mode
  const confirmMode = async (selectedMode: PhotoMode) => {
    setMode(selectedMode);
    if (!session) return;

    let photoCount = 4;
    if (selectedMode === 'single') photoCount = 1;
    if (selectedMode === 'group') photoCount = 3;

    try {
      await api.updateSession(session.id, { mode: selectedMode, photo_count: photoCount });
      setScreen('TEMPLATE_SELECT');
    } catch (err: any) {
      setError(err?.message || 'Could not update session mode');
      setScreen('TEMPLATE_SELECT');
    }
  };

  // 3. Select & confirm template
  const confirmTemplate = async (selectedTemplate: Template) => {
    setTemplate(selectedTemplate);

    let shotCount = 4;
    let initialSlots: number[] = [];
    try {
      const slots = JSON.parse(selectedTemplate.photo_slots_json);
      const indices = new Set(slots.map((s: any) => s.shotIndex !== undefined ? s.shotIndex : null));
      indices.delete(null);
      shotCount = indices.size > 0 ? indices.size : Math.min(slots.length, 4);
      initialSlots = slots.map((s: any, idx: number) => s.shotIndex !== undefined ? s.shotIndex : idx);
    } catch {
      shotCount = 4;
      initialSlots = [0, 1, 2, 0, 1, 2];
    }

    setSlotAssignments(initialSlots);
    setMode(selectedTemplate.layout_type as any);

    if (session) {
      setSession((prev) => prev ? {
        ...prev,
        template_id: selectedTemplate.id,
        photo_count: shotCount,
        mode: selectedTemplate.layout_type as any
      } : null);

      try {
        await api.updateSession(session.id, {
          templateId: selectedTemplate.id,
          photo_count: shotCount,
          mode: selectedTemplate.layout_type as any
        });
      } catch (e) {
        console.warn(e);
      }
    }
    setScreen('CAMERA');
  };

  // 4. Save captured shot
  const addCapturedPhoto = async (shotIndex: number, imageBase64: string): Promise<CapturedPhoto> => {
    if (!session) throw new Error('No active session');

    const photo = await api.uploadCapturedPhoto(session.id, shotIndex, imageBase64);
    // Attach in-memory base64 for instant preview responsiveness
    const photoWithPreview: CapturedPhoto = {
      ...photo,
      dataUrl: imageBase64
    };

    setCapturedPhotos((prev) => {
      const filtered = prev.filter((p) => p.shot_index !== shotIndex);
      return [...filtered, photoWithPreview].sort((a, b) => a.shot_index - b.shot_index);
    });

    return photoWithPreview;
  };

  // 5. Retake single shot
  const retakeSingleShot = async (photoId: number) => {
    try {
      await api.deletePhoto(photoId);
      setCapturedPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setScreen('CAMERA');
    } catch (err: any) {
      setError(err?.message || 'Could not retake photo');
    }
  };

  // 6. Retake all shots
  const retakeAllShots = async () => {
    for (const p of capturedPhotos) {
      try {
        await api.deletePhoto(p.id);
      } catch {
        // ignore
      }
    }
    setCapturedPhotos([]);
    setScreen('CAMERA');
  };

  // 7. Reorder captured photos
  const reorderCapturedPhotos = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= capturedPhotos.length) return;

    const updated = [...capturedPhotos];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    const reorderedWithOrders = updated.map((p, idx) => ({
      ...p,
      sort_order: idx
    }));

    setCapturedPhotos(reorderedWithOrders);

    // Sync to backend asynchronously
    api.reorderPhotos(
      reorderedWithOrders.map((p) => ({ id: p.id, sortOrder: p.sort_order }))
    ).catch(console.warn);
  };

  // 8. Compose final high-resolution print image
  const composeFinalPhoto = async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);

    try {
      const final = await api.composePhoto({
        sessionId: session.id,
        templateId: template?.id || session.template_id || 1,
        mode,
        editOptions: editState,
        stickers,
        textOverlays,
        slotAssignments,
        copies,
        autoPrint: true
      });

      setFinalPhoto(final);
      setScreen('PRINT_DOWNLOAD');
    } catch (err: any) {
      setError(err?.message || 'Composition failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 9. Reset session and return home safely
  const resetToHome = () => {
    if (session) {
      api.resetSession(session.id).catch(() => {});
    }
    setSession(null);
    setCapturedPhotos([]);
    setFinalPhoto(null);
    setEditState(defaultEditState);
    setStickers([]);
    setTextOverlays([]);
    setError(null);
    setIsLoading(false);
    setScreen('HOME');
  };

  return (
    <KioskContext.Provider
      value={{
        screen,
        setScreen,
        session,
        mode,
        setMode,
        template,
        setTemplate,
        capturedPhotos,
        finalPhoto,
        editState,
        setEditState,
        stickers,
        setStickers,
        textOverlays,
        setTextOverlays,
        copies,
        setCopies,
        slotAssignments,
        setSlotAssignments,
        isLoading,
        error,
        setError,
        startNewSession,
        confirmMode,
        confirmTemplate,
        addCapturedPhoto,
        retakeSingleShot,
        retakeAllShots,
        reorderCapturedPhotos,
        composeFinalPhoto,
        resetToHome
      }}
    >
      {children}
    </KioskContext.Provider>
  );
};

export const useKiosk = (): KioskContextType => {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error('useKiosk must be used within a KioskProvider');
  }
  return context;
};
