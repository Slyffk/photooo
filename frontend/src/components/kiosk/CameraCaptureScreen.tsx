import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Volume2, VolumeX, Sparkles, AlertCircle, CheckCircle2, RotateCcw, Clock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { TouchButton } from '../common/TouchButton';
import { cameraAdapter, type VideoDeviceInfo } from '../../services/cameraAdapter';
import { soundService } from '../../services/audioService';
import { wsClient } from '../../services/websocket';

export const CameraCaptureScreen: React.FC = () => {
  const { t } = useLanguage();
  const { mode, template, session, addCapturedPhoto, retakeSingleShot, setScreen, capturedPhotos } = useKiosk();

  const videoRef = useRef<HTMLVideoElement>(null);

  const [cameras, setCameras] = useState<VideoDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0); // 0 = Instant, 3 = 3s, 5 = 5s
  const [currentCountdown, setCurrentCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSimulatedFeed, setIsSimulatedFeed] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [latestShotPreview, setLatestShotPreview] = useState<string | null>(null);
  const [shotNotice, setShotNotice] = useState<string | null>(null);
  const [isAllDone, setIsAllDone] = useState<boolean>(false);

  // Parse template slots to derive exact slot aspect ratio and overlay position
  const templateSlots = React.useMemo(() => {
    if (!template?.photo_slots_json) return [];
    try {
      return JSON.parse(template.photo_slots_json);
    } catch {
      return [];
    }
  }, [template]);

  // Target total shots accurately derived from template slots or session
  const totalShots = React.useMemo(() => {
    if (templateSlots.length > 0) {
      const indices = new Set(templateSlots.map((s: any) => (s.shotIndex !== undefined ? s.shotIndex : null)));
      indices.delete(null);
      if (indices.size > 0) return indices.size;
      return templateSlots.length;
    }
    return session?.photo_count || (mode === 'single' ? 1 : mode === 'group' ? 3 : 4);
  }, [templateSlots, session, mode]);

  // Next slot index to capture (1-based: 1..totalShots)
  const currentShotIndex = Math.min(capturedPhotos.length + 1, totalShots);

  // Current active slot for the currentShotIndex
  const activeSlot = React.useMemo(() => {
    if (templateSlots.length === 0) return null;
    const shotIdx = currentShotIndex - 1;
    const matched = templateSlots.find((s: any) => s.shotIndex === shotIdx);
    return matched || templateSlots[shotIdx % templateSlots.length] || templateSlots[0];
  }, [templateSlots, currentShotIndex]);

  const canvasWidth = template?.canvas_width || 726;
  const canvasHeight = template?.canvas_height || 1024;

  // Frame padding around the slot to show the template's cute border / decorations
  const pad = 24;
  const padX = activeSlot ? Math.min(pad, activeSlot.x, canvasWidth - (activeSlot.x + activeSlot.width)) : 0;
  const padY = activeSlot ? Math.min(pad, activeSlot.y, canvasHeight - (activeSlot.y + activeSlot.height)) : 0;

  const totalBoxWidth = activeSlot ? activeSlot.width + 2 * padX : 16;
  const totalBoxHeight = activeSlot ? activeSlot.height + 2 * padY : 9;
  const slotAspectRatio = totalBoxWidth / totalBoxHeight;

  // Percentage positioning of video inside the frame container
  const videoLeftPct = activeSlot ? (padX / totalBoxWidth) * 100 : 0;
  const videoTopPct = activeSlot ? (padY / totalBoxHeight) * 100 : 0;
  const videoWidthPct = activeSlot ? (activeSlot.width / totalBoxWidth) * 100 : 100;
  const videoHeightPct = activeSlot ? (activeSlot.height / totalBoxHeight) * 100 : 100;
  const videoRadius = activeSlot?.radius ? Math.min(24, activeSlot.radius * 1.5) : 16;

  // Initialize camera preview - request real physical camera directly
  const initCamera = useCallback(async (targetDeviceId?: string) => {
    if (!videoRef.current) return;

    setPermissionDenied(false);
    const res = await cameraAdapter.startStream(videoRef.current, targetDeviceId);

    setCameras(res.devices);
    if (res.activeDeviceId) {
      setSelectedCameraId(res.activeDeviceId);
    }
    setIsSimulatedFeed(res.isSimulated);
    setPermissionDenied(!!res.permissionDenied);
  }, []);

  useEffect(() => {
    let mounted = true;

    initCamera();

    return () => {
      mounted = false;
      cameraAdapter.stopStream();
    };
  }, [initCamera]);

  // Handle camera switch
  const handleSwitchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (videoRef.current) {
      const res = await cameraAdapter.startStream(videoRef.current, deviceId);
      setIsSimulatedFeed(res.isSimulated);
      setPermissionDenied(!!res.permissionDenied);
    }
  };

  // Trigger flash effect
  const triggerFlash = useCallback(() => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 450);
  }, []);

  // Listen for WebSocket photo_captured event (fired by Canon Hotfolder or API upload)
  useEffect(() => {
    const unsub = wsClient.on('photo_captured', (payload: any) => {
      if (!session || payload.sessionId !== session.id) return;

      triggerFlash();
      soundService.playShutterSound();

      if (payload.dataUrl || payload.filePath) {
        setLatestShotPreview(payload.dataUrl || payload.filePath);
      }

      const notice = t.cameraShotDoneToast.replace('{shot}', String(payload.shotIndex));
      setShotNotice(notice);
      setTimeout(() => setShotNotice(null), 2500);

      // Check if total shots reached
      if (payload.shotIndex >= totalShots || (capturedPhotos.length + 1) >= totalShots) {
        setIsAllDone(true);
        setTimeout(() => {
          cameraAdapter.stopStream();
          setScreen('PHOTO_SELECT');
        }, 1500);
      }
    });

    return () => unsub();
  }, [session, totalShots, capturedPhotos.length, triggerFlash, t, setScreen]);

  // Manual Trigger (Spacebar, Enter, or Touchscreen Shutter Button)
  const triggerManualShot = useCallback(async () => {
    if (isCapturing || isAllDone || capturedPhotos.length >= totalShots) return;
    setIsCapturing(true);

    try {
      // Optional Countdown
      if (countdownSeconds > 0) {
        for (let sec = countdownSeconds; sec > 0; sec--) {
          setCurrentCountdown(sec);
          soundService.playCountdownBeep(sec === 1);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setCurrentCountdown(null);
      }

      triggerFlash();
      soundService.playShutterSound();

      const base64 = cameraAdapter.captureFrame();
      setLatestShotPreview(base64);

      await addCapturedPhoto(currentShotIndex, base64);
    } catch (err) {
      console.error('Error during manual shot:', err);
    } finally {
      setIsCapturing(false);
      setCurrentCountdown(null);
    }
  }, [isCapturing, isAllDone, capturedPhotos.length, totalShots, countdownSeconds, currentShotIndex, triggerFlash, addCapturedPhoto]);

  // Keyboard shortcut listener: Spacebar or Enter triggers shot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
        e.preventDefault();
        triggerManualShot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerManualShot]);

  // Retake previous shot
  const handleRetakeLast = async () => {
    if (capturedPhotos.length === 0 || isCapturing) return;
    const lastPhoto = capturedPhotos[capturedPhotos.length - 1];
    if (lastPhoto) {
      await retakeSingleShot(lastPhoto.id);
      setIsAllDone(false);
      setLatestShotPreview(
        capturedPhotos.length > 1
          ? capturedPhotos[capturedPhotos.length - 2].dataUrl || capturedPhotos[capturedPhotos.length - 2].file_path
          : null
      );
    }
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0 justify-between px-6 py-2 max-w-7xl mx-auto w-full select-none">
      {/* Full screen Flash overlay */}
      {flashActive && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none animate-flash" />
      )}

      {/* Top Bar with Camera Controls & Photographer Status */}
      <div className="flex-shrink-0 flex items-center justify-between z-10 mb-2">
        <div className="flex items-center gap-3">
          {/* Active Shot Badge */}
          <div className="px-4 py-2 rounded-2xl bg-white/95 shadow-soft border border-cream-200 flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm font-black text-korean-charcoal tracking-wide">
              {t.cameraShotProgress
                .replace('{current}', String(Math.min(currentShotIndex, totalShots)))
                .replace('{total}', String(totalShots))}
            </span>
          </div>

          {/* Shot Progress Dots */}
          <div className="hidden sm:flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-2xl border border-cream-200 shadow-soft">
            {Array.from({ length: totalShots }).map((_, idx) => {
              const shotNum = idx + 1;
              const isCaptured = shotNum < currentShotIndex;
              const isCurrent = shotNum === currentShotIndex;

              return (
                <div
                  key={shotNum}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                    isCaptured
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : isCurrent
                      ? 'bg-korean-charcoal text-white ring-2 ring-korean-butter scale-105'
                      : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  {isCaptured ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <span>{shotNum}</span>
                  )}
                </div>
              );
            })}
          </div>

          {isSimulatedFeed && (
            <button
              onClick={() => initCamera()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold border border-amber-300 shadow-soft cursor-pointer active:scale-95 transition-all"
              title="คลิกเพื่อเชื่อมต่อกล้องจริง"
            >
              <Camera className="w-4 h-4 text-amber-700 animate-pulse" />
              <span>โหมดจำลอง</span>
            </button>
          )}

          {permissionDenied && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>กรุณากด "Allow (อนุญาต)" ให้เบราว์เซอร์เข้าถึงกล้อง</span>
            </div>
          )}
        </div>

        {/* Central Photographer Instruction Pill */}
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-soft">
          <Camera className="w-4 h-4 text-amber-600 animate-bounce" />
          <span className="text-xs font-black text-amber-900 tracking-wide">
            {t.cameraPhotographerPrompt}
          </span>
        </div>

        {/* Timer selector & Controls */}
        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              soundService.setSoundEnabled(next);
            }}
            className="p-3 rounded-2xl bg-white/90 border border-cream-200 shadow-soft text-neutral-600 hover:text-neutral-900 cursor-pointer active:scale-95"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-neutral-400" />}
          </button>

          {/* Countdown Buttons (0s ทันที, 3s, 5s) */}
          <div className="flex items-center bg-white/90 p-1.5 rounded-2xl border border-cream-200 shadow-soft gap-1">
            {[0, 3, 5].map((sec) => (
              <button
                key={sec}
                disabled={isCapturing}
                onClick={() => setCountdownSeconds(sec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  countdownSeconds === sec
                    ? 'bg-korean-charcoal text-white shadow-touch'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {sec === 0 ? 'ทันที' : `${sec}s`}
              </button>
            ))}
          </div>

          {/* Camera switcher if multiple detected */}
          {cameras.length > 1 && (
            <button
              disabled={isCapturing}
              onClick={() => {
                const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
                const nextDevice = cameras[(currentIndex + 1) % cameras.length];
                if (nextDevice) handleSwitchCamera(nextDevice.deviceId);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 border border-cream-200 shadow-soft text-xs font-bold text-neutral-700 hover:bg-white cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t.switchCamera}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewfinder Frame Container */}
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center p-2 overflow-hidden bg-neutral-950/20 rounded-3xl border border-cream-200">
        {/* Focused Active Slot Viewfinder Box with Live Frame Overlay */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border-4 border-white bg-black transition-all duration-300 ease-out"
          style={{
            aspectRatio: slotAspectRatio,
            height: '100%',
            maxHeight: '100%',
            maxWidth: '100%',
          }}
        >
          {/* Inner Video Stream filling exact slot hole */}
          <div
            className="absolute overflow-hidden"
            style={{
              left: `${videoLeftPct}%`,
              top: `${videoTopPct}%`,
              width: `${videoWidthPct}%`,
              height: `${videoHeightPct}%`,
              borderRadius: `${videoRadius}px`,
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>

          {/* Live Transparent Template Frame Overlay directly on the slot */}
          {template?.overlay_url && activeSlot && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <svg
                viewBox={`${activeSlot.x - padX} ${activeSlot.y - padY} ${totalBoxWidth} ${totalBoxHeight}`}
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <image
                  href={template.overlay_url}
                  width={canvasWidth}
                  height={canvasHeight}
                />
              </svg>
            </div>
          )}

          {/* Framing Corner Guidelines */}
          <div
            className="absolute pointer-events-none border border-white/30 z-20"
            style={{
              left: `${videoLeftPct}%`,
              top: `${videoTopPct}%`,
              width: `${videoWidthPct}%`,
              height: `${videoHeightPct}%`,
              borderRadius: `${videoRadius}px`,
            }}
          >
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/80" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/80" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/80" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/80" />
          </div>

          {/* Floating Slot Badge */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-black tracking-wider uppercase border border-white/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>ช่องที่ {currentShotIndex} / {totalShots}</span>
          </div>

          {/* Toast Notification when photo captured */}
          {shotNotice && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-2xl bg-emerald-500/95 text-white text-sm font-black shadow-glow animate-pop flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>{shotNotice}</span>
            </div>
          )}

          {/* Giant Countdown Overlay */}
          {currentCountdown !== null && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 backdrop-blur-xs pointer-events-none">
              <div className="w-44 h-44 rounded-full bg-white/95 shadow-glow flex flex-col items-center justify-center animate-pop border-4 border-korean-butter">
                <span className="text-8xl font-black text-korean-charcoal leading-none">
                  {currentCountdown}
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-neutral-500 mt-2">
                  {t.capturingNow}
                </span>
              </div>
            </div>
          )}

          {/* Completion Overlay */}
          {isAllDone && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-pop">
              <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl border-4 border-korean-butter flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="text-2xl font-black text-korean-charcoal">
                  {t.cameraAllShotsDone.replace('{total}', String(totalShots))}
                </h3>
                <p className="text-sm font-medium text-neutral-500">
                  {t.loading}
                </p>
              </div>
            </div>
          )}

          {/* Latest Captured Thumbnail Pip */}
          {latestShotPreview && !currentCountdown && !isAllDone && (
            <div className="absolute bottom-4 right-4 z-20 w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-glow animate-pop bg-neutral-900">
              <img src={latestShotPreview} alt="Captured shot preview" className="w-full h-full object-cover" />
              <div className="absolute bottom-1 right-1 bg-black/75 px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
                ช็อต #{capturedPhotos.length}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Control Bar */}
      <div className="flex-shrink-0 flex items-center justify-between mt-2 pt-2 z-20">
        {/* Back Button */}
        <TouchButton
          variant="secondary"
          size="md"
          disabled={isCapturing || isAllDone}
          onClick={() => {
            cameraAdapter.stopStream();
            setScreen('TEMPLATE_SELECT');
          }}
        >
          {t.back}
        </TouchButton>

        {/* Center Controls: Main Trigger + Retake Last */}
        <div className="flex items-center gap-4">
          {capturedPhotos.length > 0 && !isAllDone && (
            <TouchButton
              variant="outline"
              size="md"
              disabled={isCapturing}
              onClick={handleRetakeLast}
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-100"
              icon={<RotateCcw className="w-4 h-4 text-neutral-500" />}
            >
              {t.cameraRetakePrev}
            </TouchButton>
          )}

          {/* Main Shutter Button for Photographer / Touch Screen / Spacebar */}
          <TouchButton
            variant="primary"
            size="lg"
            disabled={isCapturing || isAllDone || capturedPhotos.length >= totalShots}
            onClick={triggerManualShot}
            className="px-10 py-3.5 text-lg font-black shadow-touch bg-korean-charcoal text-white hover:bg-neutral-800"
            icon={<Camera className="w-6 h-6 text-korean-butter" />}
          >
            {isCapturing
              ? `${t.loading}`
              : isAllDone
              ? 'ถ่ายครบแล้ว!'
              : `${t.cameraTriggerManual} (${currentShotIndex}/${totalShots})`}
          </TouchButton>
        </div>

        {/* Right Info: Shutter guide hint */}
        <div className="w-32 text-right">
          <span className="text-[11px] font-bold text-neutral-400 block">
            กดชัตเตอร์ Canon
          </span>
          <span className="text-[10px] text-neutral-400 block">
            หรือ Spacebar
          </span>
        </div>
      </div>
    </div>
  );
};
