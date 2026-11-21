import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Check, Sparkles, MoveRight, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { TouchButton } from '../common/TouchButton';
import type { PhotoSlot } from '../../types';

export const PhotoSelectionScreen: React.FC = () => {
  const { t, language } = useLanguage();
  const {
    capturedPhotos,
    template,
    slotAssignments,
    setSlotAssignments,
    setScreen
  } = useKiosk();

  // Active selected shot to place into a slot
  const [selectedShotIndex, setSelectedShotIndex] = useState<number>(0);

  // Parse template photo slots
  let slots: PhotoSlot[] = [];
  try {
    if (template?.photo_slots_json) {
      slots = JSON.parse(template.photo_slots_json);
    }
  } catch {
    slots = [];
  }

  const canvasW = template?.canvas_width || 726;
  const canvasH = template?.canvas_height || 1024;

  // Ensure slot assignments match the slots count
  const currentAssignments = slots.map((s, idx) => {
    if (slotAssignments && slotAssignments[idx] !== undefined) {
      return slotAssignments[idx];
    }
    return s.shotIndex !== undefined ? s.shotIndex : idx % Math.max(1, capturedPhotos.length);
  });

  // Handle slot click: assign selected photo to this slot
  const handleSlotClick = (slotIdx: number) => {
    const updated = [...currentAssignments];
    updated[slotIdx] = selectedShotIndex;
    setSlotAssignments(updated);
  };

  // Reset to default template assignments
  const handleResetDefault = () => {
    const defaults = slots.map((s, idx) =>
      s.shotIndex !== undefined ? s.shotIndex : idx % Math.max(1, capturedPhotos.length)
    );
    setSlotAssignments(defaults);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 justify-between px-6 py-3 max-w-7xl mx-auto w-full select-none animate-pop">
      {/* Title */}
      <div className="text-center mb-2 flex-shrink-0">
        <h2 className="text-3xl font-black text-korean-charcoal tracking-tight">
          เลือกรูปใส่ในช่องเทมเพลต์
        </h2>
        <p className="text-sm text-neutral-500 font-medium">
          แตะเลือกรูปภาพด้านซ้าย แล้วแตะช่องในกรอบเทมเพลต์ด้านขวาเพื่อจัดวางตำแหน่งตามต้องการ
        </p>
      </div>

      {/* Main Body: Left Photo Selector, Right Template Slot Assignment Preview */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 items-center justify-center my-auto overflow-hidden w-full">
        {/* Left Side: Captured Shots Palette */}
        <div className="w-full lg:w-80 flex flex-col gap-3 flex-shrink-0">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              รูปที่ถ่ายทั้งหมด ({capturedPhotos.length} รูป)
            </span>
            <span className="text-xs font-bold text-rose-500">
              กดเลือกรูปเพื่อจัดวาง
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 max-h-[52vh] overflow-y-auto p-1 scrollbar-none">
            {capturedPhotos.map((photo, index) => {
              const isSelected = selectedShotIndex === index;
              const imgSrc = photo.dataUrl || `/storage/sessions/${photo.session_id}/captured/${photo.original_filename}`;

              return (
                <button
                  key={photo.id || index}
                  onClick={() => setSelectedShotIndex(index)}
                  className={`relative flex items-center gap-3 p-2 rounded-2xl border-3 transition-all cursor-pointer text-left bg-white shadow-soft active:scale-95 ${
                    isSelected
                      ? 'border-korean-charcoal shadow-touch ring-4 ring-korean-charcoal/15 scale-[1.02]'
                      : 'border-cream-200 hover:border-cream-300'
                  }`}
                >
                  {/* Photo Shot Number */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      isSelected
                        ? 'bg-korean-charcoal text-white'
                        : 'bg-cream-100 text-neutral-600'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Thumbnail Image */}
                  <div className="w-20 h-14 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                    <img
                      src={imgSrc}
                      alt={`Shot ${index + 1}`}
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-korean-charcoal block truncate">
                      รูปช็อตที่ {index + 1}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-semibold">
                      {isSelected ? '✓ กำลังเลือกอยู่นี้' : 'แตะเพื่อเลือก'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Interactive Template Frame Preview */}
        <div className="relative flex items-center justify-center p-3 bg-white rounded-3xl border-2 border-cream-200 shadow-soft max-h-[58vh] h-full overflow-hidden">
          <div
            className="relative rounded-2xl shadow-inner overflow-hidden select-none"
            style={{
              aspectRatio: `${canvasW} / ${canvasH}`,
              height: '100%',
              maxHeight: '52vh',
              backgroundColor: '#FAF9F6'
            }}
          >
            {/* 1. Photos assigned in slots (Clickable to assign) */}
            {slots.map((slot, i) => {
              const assignedShotIdx = currentAssignments[i];
              const photo = capturedPhotos[assignedShotIdx] || capturedPhotos[0];
              const imgSrc = photo?.dataUrl || (photo?.file_path ? `/storage/sessions/${photo.session_id}/captured/${photo.original_filename}` : '');

              const leftPct = (slot.x / canvasW) * 100;
              const topPct = (slot.y / canvasH) * 100;
              const widthPct = (slot.width / canvasW) * 100;
              const heightPct = (slot.height / canvasH) * 100;

              return (
                <div
                  key={i}
                  onClick={() => handleSlotClick(i)}
                  className="absolute overflow-hidden bg-neutral-200 cursor-pointer group transition-all"
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    borderRadius: slot.radius ? `${slot.radius * 0.4}px` : 0
                  }}
                  title={`คลิกเพื่อใส่รูปที่ ${selectedShotIndex + 1} ในช่องนี้`}
                >
                  {imgSrc && (
                    <img
                      src={imgSrc}
                      alt={`Slot ${i + 1}`}
                      className="w-full h-full object-cover scale-x-[-1] pointer-events-none"
                    />
                  )}

                  {/* Slot Hover & Active Overlay */}
                  <div className="absolute inset-0 bg-korean-charcoal/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="px-2 py-1 rounded-lg bg-black/70 text-white text-[11px] font-bold">
                      ใส่รูปที่ {selectedShotIndex + 1}
                    </span>
                  </div>

                  {/* Current Assigned Badge */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-black pointer-events-none">
                    รูป {assignedShotIdx + 1}
                  </div>
                </div>
              );
            })}

            {/* 2. Template Overlay Frame on Top */}
            {template && (
              <img
                src={template.overlay_url || template.frame_url}
                alt={template.name_en}
                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-200 flex-shrink-0">
        <button
          onClick={handleResetDefault}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-cream-200 hover:bg-cream-100 text-neutral-600 text-sm font-bold shadow-soft cursor-pointer active:scale-95 transition-all"
        >
          <RotateCcw className="w-4 h-4 text-neutral-500" />
          <span>รีเซ็ตตามค่าเริ่มต้น</span>
        </button>

        <TouchButton
          variant="primary"
          size="lg"
          onClick={() => setScreen('PHOTO_EDIT')}
          icon={<ArrowRight className="w-5 h-5 text-korean-butter" />}
          className="px-8 shadow-touch"
        >
          ยืนยันการจัดวางรูปภาพ (ไปขั้นตอนตกแต่ง)
        </TouchButton>
      </div>
    </div>
  );
};
