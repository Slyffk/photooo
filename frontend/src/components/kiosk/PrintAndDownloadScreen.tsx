import React, { useState, useEffect } from 'react';
import {
  Printer,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  ArrowRight,
  Sparkles,
  Smartphone,
  Film
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { TouchButton } from '../common/TouchButton';
import { api } from '../../services/api';
import { soundService } from '../../services/audioService';

export const PrintAndDownloadScreen: React.FC = () => {
  const { t } = useLanguage();
  const { session, finalPhoto, copies, setScreen } = useKiosk();

  // Print state
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [printStatus, setPrintStatus] = useState<'idle' | 'submitted' | 'printing' | 'completed' | 'failed'>('printing');
  const [printMessage, setPrintMessage] = useState<string>(`กำลังพิมพ์ภาพ ${copies} ใบ... กรุณารอสักครู่`);

  // QR Download state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(true);

  // Initialize printers, QR code, and sound
  useEffect(() => {
    soundService.playCelebrationChime();

    // 1. Fetch Printers
    api.getPrinters()
      .then((res) => {
        setPrinters(res.printers);
        setSelectedPrinter(res.defaultPrinter || res.printers[0]?.name || 'Microsoft Print to PDF');
      })
      .catch(console.warn);

    // 2. Generate QR Code
    if (session) {
      setQrLoading(true);
      api.createDownloadToken(session.id)
        .then((res) => {
          setQrDataUrl(res.qrDataUrl);
          setDownloadUrl(res.downloadUrl);
        })
        .catch(console.warn)
        .finally(() => setQrLoading(false));
    }

    // 3. Auto-print simulation / status update (since autoPrint was dispatched during compose)
    const timer = setTimeout(() => {
      setPrintStatus('completed');
      setPrintMessage(`พิมพ์ภาพ ${copies} ใบ เรียบร้อยแล้ว`);
    }, 4500);

    return () => clearTimeout(timer);
  }, [session, copies]);

  // Handle manual reprint if needed
  const handleReprint = async () => {
    if (!session || printStatus === 'printing') return;

    setPrintStatus('printing');
    setPrintMessage(`กำลังพิมพ์ซ้ำอีก ${copies} ใบ...`);

    try {
      await api.submitPrintJob({
        sessionId: session.id,
        copies: copies || 1,
        paperSize: '4x6',
        printerName: selectedPrinter
      });

      setTimeout(() => {
        setPrintStatus('completed');
        setPrintMessage(`พิมพ์ซ้ำ ${copies} ใบ เรียบร้อยแล้ว`);
      }, 4000);
    } catch (err: any) {
      setPrintStatus('failed');
      setPrintMessage(err?.message || 'การพิมพ์ขัดข้อง กรุณาติดต่อเจ้าหน้าที่');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-4 max-w-7xl mx-auto w-full select-none animate-pop">
      {/* Title */}
      <div className="text-center mb-2 flex-shrink-0">
        <h2 className="text-3xl font-black text-korean-charcoal tracking-tight">
          รับรูปภาพ และ สแกน QR Code
        </h2>
        <p className="text-sm text-neutral-500 font-medium">
          ระบบกำลังพิมพ์ภาพถ่ายของคุณ และคุณสามารถสแกนเพื่อรับไฟล์ภาพความละเอียดสูง + ภาพเคลื่อนไหว GIF ได้ทันที
        </p>
      </div>

      {/* 3 Main Display Cards: 1. Auto-Print & Status, 2. Live Boomerang GIF & Photo Preview, 3. QR Download */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto items-stretch">
        {/* Card 1: Print Status & Final Composition Preview */}
        <div className="bg-white rounded-3xl border-2 border-cream-200 shadow-soft p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-korean-charcoal text-white shadow-touch">
                <Printer className="w-6 h-6 text-korean-butter" />
              </div>
              <div>
                <h3 className="text-xl font-black text-korean-charcoal leading-none">
                  สถานะการพิมพ์รูปภาพ
                </h3>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mt-1 block">
                  พิมพ์ {copies} ใบ (ขนาด 4x6 นิ้ว)
                </span>
              </div>
            </div>

            {/* Print Status Feedback Banner */}
            <div
              className={`p-4 rounded-2xl mb-4 flex items-center gap-3 text-sm font-bold ${
                printStatus === 'completed'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : printStatus === 'failed'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
              }`}
            >
              {printStatus === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : printStatus === 'failed' ? (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              ) : (
                <Printer className="w-5 h-5 text-amber-600 flex-shrink-0 animate-bounce" />
              )}
              <span>{printMessage}</span>
            </div>

            {/* Print Preview Thumbnail */}
            {finalPhoto?.jpgUrl && (
              <div className="w-full flex items-center justify-center p-2 bg-cream-50 rounded-2xl border border-cream-200 mb-3">
                <img
                  src={finalPhoto.jpgUrl}
                  alt="Final Print Composition"
                  className="max-h-48 object-contain rounded-xl shadow-soft"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleReprint}
            disabled={printStatus === 'printing'}
            className="w-full py-3 rounded-2xl bg-cream-100 hover:bg-cream-200 text-korean-charcoal text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ซ้ำอีกครั้ง (Reprint)</span>
          </button>
        </div>

        {/* Card 2: Live Animated Boomerang GIF Preview */}
        <div className="bg-white rounded-3xl border-2 border-cream-200 shadow-soft p-5 flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-center gap-3 mb-3">
            <div className="p-3 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 shadow-soft">
              <Film className="w-6 h-6 text-purple-600 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-black text-korean-charcoal leading-none">
                ภาพเคลื่อนไหว GIF
              </h3>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mt-1 block">
                Live Boomerang Motion
              </span>
            </div>
          </div>

          {/* Live GIF View */}
          <div className="flex-1 w-full flex items-center justify-center my-auto p-2">
            {finalPhoto?.gifUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-3 border-purple-100 shadow-touch max-h-64 flex items-center justify-center bg-black">
                <img
                  src={finalPhoto.gifUrl}
                  alt="Boomerang GIF Animation"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-black tracking-wider uppercase shadow-md">
                  GIF LOOP
                </div>
              </div>
            ) : (
              <div className="w-full h-56 rounded-2xl bg-cream-100 flex items-center justify-center">
                <span className="text-xs font-bold text-neutral-400 animate-pulse">
                  กำลังสร้างไฟล์ GIF...
                </span>
              </div>
            )}
          </div>

          <p className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 mt-2">
            ✨ บันทึกไฟล์ GIF นี้ได้จาก QR Code ด้านข้าง
          </p>
        </div>

        {/* Card 3: Mobile QR Code Download Card */}
        <div className="bg-white rounded-3xl border-2 border-cream-200 shadow-soft p-5 flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-center gap-3 mb-3">
            <div className="p-3 rounded-2xl bg-cream-100 text-korean-charcoal border border-cream-300 shadow-soft">
              <QrCode className="w-6 h-6 text-korean-charcoal" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-black text-korean-charcoal leading-none">
                สแกนรับไฟล์มือถือ
              </h3>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mt-1 block">
                Mobile Instant Download
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center my-auto">
            {qrLoading ? (
              <div className="w-48 h-48 rounded-3xl bg-cream-100 flex items-center justify-center animate-pulse">
                <span className="text-sm font-bold text-neutral-400">{t.loading}</span>
              </div>
            ) : qrDataUrl ? (
              <div className="p-3 bg-white rounded-3xl border-3 border-cream-200 shadow-touch mb-2">
                <img src={qrDataUrl} alt="Download QR Code" className="w-44 h-44 object-contain" />
              </div>
            ) : (
              <div className="p-4 text-xs text-neutral-400">
                {t.downloadOffline}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 max-w-xs mt-1">
              <Smartphone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>ดาวน์โหลดได้ทั้งรูปถ่าย (JPG) และ GIF ดุ๊กดิ๊ก</span>
            </div>

            {/* Connection mode badge */}
            <div className="mt-2 flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide flex items-center gap-1.5 ${
                downloadUrl.includes('trycloudflare.com')
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  downloadUrl.includes('trycloudflare.com') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`} />
                {downloadUrl.includes('trycloudflare.com')
                  ? '4G/5G Online สแกนได้ทุกค่าย'
                  : 'โหมดวงแลน Wi-Fi'}
              </span>

              <button
                onClick={() => {
                  if (session) {
                    setQrLoading(true);
                    api.createDownloadToken(session.id)
                      .then((res) => {
                        setQrDataUrl(res.qrDataUrl);
                        setDownloadUrl(res.downloadUrl);
                      })
                      .catch(console.warn)
                      .finally(() => setQrLoading(false));
                  }
                }}
                className="px-2 py-1 rounded-lg bg-cream-100 hover:bg-cream-200 text-neutral-600 text-[10px] font-bold cursor-pointer transition-colors"
                title="รีเฟรช QR Code"
              >
                🔄 รีเฟรช QR
              </button>
            </div>

            <span className="text-[11px] font-semibold text-neutral-400 mt-1">
              SESSION: {session?.session_code}
            </span>
          </div>

          <div className="w-full mt-2 text-[10px] text-neutral-400 font-medium">
            ลิงก์ดาวน์โหลดจะหมดอายุอัตโนมัติใน 24 ชั่วโมง
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-cream-200 flex-shrink-0">
        <div className="text-xs font-bold text-neutral-400">
          ขอบคุณที่ใช้บริการ Haru Moments
        </div>

        <TouchButton
          variant="primary"
          size="lg"
          onClick={() => {
            soundService.playCelebrationChime();
            setScreen('COMPLETE');
          }}
          icon={<ArrowRight className="w-5 h-5 text-korean-butter" />}
          className="px-10 shadow-touch"
        >
          เสร็จสิ้น (Finish)
        </TouchButton>
      </div>
    </div>
  );
};
