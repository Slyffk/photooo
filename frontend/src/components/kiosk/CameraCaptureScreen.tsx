import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Volume2, VolumeX, Sparkles, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { TouchButton } from '../common/TouchButton';
import { cameraAdapter, type VideoDeviceInfo } from '../../services/cameraAdapter';
import { soundService } from '../../services/audioService';

export const CameraCaptureScreen: React.FC = () => {
  const { t } = useLanguage();
  const { mode, template, session, addCapturedPhoto, setScreen, capturedPhotos } = useKiosk();

  const videoRef = useRef<HTMLVideoElement>(null);

  const [cameras, setCameras] = useState<VideoDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(5);
  const [currentCountdown, setCurrentCountdown] = useState<number | null>(null);
  const [isCapturingSequence, setIsCapturingSequence] = useState<boolean>(false);
  const [currentShotIndex, setCurrentShotIndex] = useState<number>(1);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSimulatedFeed, setIsSimulatedFeed] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [latestShotPreview, setLatestShotPreview] = useState<string | null>(null);

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
  const totalShots = (() => {
    if (templateSlots.length > 0) {
      const indices = new Set(templateSlots.map((s: any) => (s.shotIndex !== undefined ? s.shotIndex : null)));
      indices.delete(null);
      if (indices.size > 0) return indices.size;
      return templateSlots.length;
    }
    return session?.photo_count || (mode === 'single' ? 1 : mode === 'group' ? 3 : 4);
  })();

  // Current active slot for the currentShotIndex (1-based: 1..totalShots)
  const activeSlot = React.useMemo(() => {
    if (templateSlots.length === 0) return null;
    const shotIdx = (isCapturingSequence ? currentShotIndex : 1) - 1;
    const matched = templateSlots.find((s: any) => s.shotIndex === shotIdx);
    return matched || templateSlots[shotIdx % templateSlots.length] || templateSlots[0];
  }, [templateSlots, isCapturingSequence, currentShotIndex]);

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
  const triggerFlash = () => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 450);
  };

  // Perform single shot capture
  const takeSingleShot = useCallback(async (shotIndex: number) => {
    try {
      soundService.playShutterSound();
      triggerFlash();

      const base64 = cameraAdapter.captureFrame();
      setLatestShotPreview(base64);

      await addCapturedPhoto(shotIndex, base64);
    } catch (err) {
      console.error('Error during frame capture:', err);
    }
  }, [addCapturedPhoto]);

  // Main capture loop sequence
  const startCaptureSequence = async () => {
    if (isCapturingSequence) return;
    setIsCapturingSequence(true);

    for (let shot = 1; shot <= totalShots; shot++) {
      setCurrentShotIndex(shot);

      // Countdown loop
      for (let sec = countdownSeconds; sec > 0; sec--) {
        setCurrentCountdown(sec);
        soundService.playCountdownBeep(sec === 1);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setCurrentCountdown(null);
      await takeSingleShot(shot);

      // Brief pause between shots if more shots remain
      if (shot < totalShots) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }

    setIsCapturingSequence(false);
    cameraAdapter.stopStream();
    setScreen('PHOTO_SELECT');
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0 justify-between px-6 py-2 max-w-7xl mx-auto w-full select-none">
      {/* Full screen Flash overlay */}
      {flashActive && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none animate-flash" />
      )}

      {/* Top Bar with Camera Controls */}
      <div className="flex-shrink-0 flex items-center justify-between z-10 mb-2">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white/90 shadow-soft border border-cream-200 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm font-black text-korean-charcoal tracking-wide">
              {t.cameraShotProgress
                .replace('{current}', String(isCapturingSequence ? currentShotIndex : Math.min(1, totalShots)))
                .replace('{total}', String(totalShots))}
            </span>
          </div>

          {isSimulatedFeed && (
            <button
              onClick={() => initCamera()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold border border-amber-300 shadow-soft cursor-pointer active:scale-95 transition-all"
              title="คลิกเพื่อเชื่อมต่อกล้องจริง"
            >
              <Camera className="w-4 h-4 text-amber-700 animate-pulse" />
              <span>โหมดจำลอง (คลิกเพื่อเชื่อมต่อกล้องจริง)</span>
            </button>
          )}

          {permissionDenied && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>กรุณากด "Allow (อนุญาต)" ให้เบราว์เซอร์เข้าถึงกล้อง</span>
            </div>
          )}
        </div>

        {/* Timer selector & Camera toggle */}
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

          {/* Countdown Buttons (3s, 5s, 10s) */}
          <div className="flex items-center bg-white/90 p-1.5 rounded-2xl border border-cream-200 shadow-soft gap-1">
            {[3, 5, 10].map((sec) => (
              <button
                key={sec}
                disabled={isCapturingSequence}
                onClick={() => setCountdownSeconds(sec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  countdownSeconds === sec
                    ? 'bg-korean-charcoal text-white shadow-touch'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Camera switcher if multiple detected */}
          {cameras.length > 1 && (
            <button
              disabled={isCapturingSequence}
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
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-black tracking-wider uppercase border border-white/20">
            ช็อตที่ {isCapturingSequence ? currentShotIndex : 1} / {totalShots}
          </div>

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

          {/* Latest Captured Thumbnail Pip */}
          {latestShotPreview && !currentCountdown && (
            <div className="absolute bottom-4 right-4 z-20 w-24 h-16 rounded-xl overflow-hidden border-2 border-white shadow-glow animate-pop">
              <img src={latestShotPreview} alt="Captured shot" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Control Bar */}
      <div className="flex-shrink-0 flex items-center justify-between mt-2 pt-2 z-20">
        <TouchButton
          variant="secondary"
          size="md"
          disabled={isCapturingSequence}
          onClick={() => {
            cameraAdapter.stopStream();
            setScreen('TEMPLATE_SELECT');
          }}
        >
          {t.back}
        </TouchButton>

        {/* Main Big Capture Trigger */}
        <TouchButton
          variant="primary"
          size="lg"
          disabled={isCapturingSequence}
          onClick={startCaptureSequence}
          className="px-10 py-3.5 text-lg font-black shadow-touch bg-korean-charcoal text-white hover:bg-neutral-800"
          icon={<Camera className="w-6 h-6 text-korean-butter" />}
        >
          {isCapturingSequence
            ? `${t.loading} (${currentShotIndex}/${totalShots})`
            : `${t.start} (${totalShots} ${t.catAll})`}
        </TouchButton>

        <div className="w-24" /> {/* spacer balance */}
      </div>
    </div>
  );
};
