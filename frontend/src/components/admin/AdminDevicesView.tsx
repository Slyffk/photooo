import React, { useState, useEffect, useRef } from 'react';
import { Camera, Printer, HardDrive, CheckCircle2, AlertTriangle, RefreshCw, Play } from 'lucide-react';
import { api } from '../../services/api';
import { cameraAdapter, type VideoDeviceInfo } from '../../services/cameraAdapter';
import { TouchButton } from '../common/TouchButton';

export const AdminDevicesView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameras, setCameras] = useState<VideoDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [printers, setPrinters] = useState<any[]>([]);
  const [defaultPrinter, setDefaultPrinter] = useState('');
  const [testPrintStatus, setTestPrintStatus] = useState<string | null>(null);
  const [isCameraTesting, setIsCameraTesting] = useState(false);

  useEffect(() => {
    // List cameras
    cameraAdapter.listVideoDevices().then((devices) => {
      setCameras(devices);
      if (devices.length > 0) setSelectedCameraId(devices[0].deviceId);
    });

    // List printers
    api.getPrinters().then((res) => {
      setPrinters(res.printers);
      setDefaultPrinter(res.defaultPrinter);
    });

    return () => {
      cameraAdapter.stopStream();
    };
  }, []);

  const handleStartCameraTest = async () => {
    if (videoRef.current) {
      setIsCameraTesting(true);
      await cameraAdapter.startStream(videoRef.current, selectedCameraId, 1920, 1080);
    }
  };

  const handleStopCameraTest = () => {
    cameraAdapter.stopStream();
    setIsCameraTesting(false);
  };

  const handleRunTestPrint = async () => {
    setTestPrintStatus('Dispatching Windows test print job...');
    try {
      const res = await api.runTestPrint(defaultPrinter);
      setTestPrintStatus(`Success: ${res.message} (Job #${res.jobId})`);
    } catch (err: any) {
      setTestPrintStatus(`Error: ${err?.message || 'Print dispatch failed'}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-black text-korean-charcoal tracking-tight">
          Device & Hardware Management
        </h2>
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
          USB Webcams, Windows Drivers, Spooler Diagnostics, and System Health
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device 1: Camera Hardware Test */}
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-cream-100 text-korean-charcoal">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-korean-charcoal">Camera Hardware</h3>
                <span className="text-xs text-neutral-400 font-bold">WebRTC & Modular DSLR Interface</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block uppercase text-[10px] text-neutral-400 font-bold mb-1.5">
                Select Active Camera Device
              </label>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-cream-300 font-bold text-xs bg-cream-50 focus:outline-none"
              >
                {cameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Camera Viewfinder Test Box */}
            <div className="w-full h-52 bg-neutral-900 rounded-2xl overflow-hidden mb-4 relative flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {!isCameraTesting && (
                <div className="absolute inset-0 bg-neutral-900/80 flex flex-col items-center justify-center text-white p-4 text-center">
                  <Camera className="w-8 h-8 text-neutral-500 mb-2" />
                  <span className="text-xs font-bold text-neutral-300">Preview Idle</span>
                  <span className="text-[10px] text-neutral-500 mt-1">Tap below to open diagnostic feed</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isCameraTesting ? (
              <TouchButton
                variant="primary"
                size="sm"
                onClick={handleStartCameraTest}
                icon={<Play className="w-4 h-4 text-korean-butter" />}
                fullWidth
              >
                Start Camera Preview Test
              </TouchButton>
            ) : (
              <TouchButton
                variant="secondary"
                size="sm"
                onClick={handleStopCameraTest}
                fullWidth
              >
                Stop Preview Test
              </TouchButton>
            )}
          </div>
        </div>

        {/* Device 2: Windows Printer Hardware Test */}
        <div className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-cream-100 text-korean-charcoal">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-korean-charcoal">Windows Print Spooler</h3>
                <span className="text-xs text-neutral-400 font-bold">Standard Windows Print Subsystem</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block uppercase text-[10px] text-neutral-400 font-bold mb-1.5">
                Installed Printers ({printers.length} Detected)
              </label>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-1">
                {printers.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-cream-50 border border-cream-200 text-xs font-bold text-neutral-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${p.status === 'ready' || p.status === 'virtual' ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                      <span>{p.name}</span>
                    </div>
                    {p.isDefault && (
                      <span className="px-2 py-0.5 rounded-md bg-cream-200 text-korean-charcoal text-[10px] font-black uppercase">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {testPrintStatus && (
              <div className="p-3 rounded-xl bg-cream-100 text-neutral-700 text-xs font-bold mb-4">
                {testPrintStatus}
              </div>
            )}
          </div>

          <TouchButton
            variant="primary"
            size="sm"
            onClick={handleRunTestPrint}
            icon={<Printer className="w-4 h-4 text-korean-butter" />}
            fullWidth
          >
            Dispatch Windows Test Print
          </TouchButton>
        </div>
      </div>
    </div>
  );
};
