import React, { useState, useRef } from 'react';
import {
  Sliders,
  Sparkles,
  RotateCw,
  Sun,
  Contrast,
  Palette,
  ArrowLeft,
  ArrowRight,
  Smile,
  X,
  Move
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useKiosk } from '../../context/KioskContext';
import { TouchButton } from '../common/TouchButton';
import type { PhotoEditState, StickerItem, PhotoSlot } from '../../types';

export const PhotoEditorScreen: React.FC = () => {
  const { t } = useLanguage();
  const {
    capturedPhotos,
    template,
    slotAssignments,
    copies,
    editState,
    setEditState,
    stickers,
    setStickers,
    composeFinalPhoto,
    isLoading,
    setScreen
  } = useKiosk();

  const [activeTab, setActiveTab] = useState<'filter' | 'adjust' | 'stickers'>('filter');
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Parse template photo slots
  let slots: PhotoSlot[] = [];
  try {
    if (template?.photo_slots_json) {
      slots = JSON.parse(template.photo_slots_json);
    }
  } catch {
    slots = [];
  }

  // Filter Presets
  const filters: Array<{ id: PhotoEditState['filter']; label: string }> = [
    { id: 'original', label: t.filterOriginal },
    { id: 'bw', label: t.filterBw },
    { id: 'warm', label: t.filterWarm },
    { id: 'cool', label: t.filterCool },
    { id: 'vintage', label: t.filterVintage }
  ];

  // Available Korean Stickers
  const availableStickers = [
    { name: 'Heart', icon: '💖' },
    { name: 'Sparkles', icon: '✨' },
    { name: 'Ribbon', icon: '🎀' },
    { name: 'Crown', icon: '👑' },
    { name: 'Star', icon: '⭐' },
    { name: 'Bunny', icon: '🐰' },
    { name: 'Cat', icon: '🐱' },
    { name: 'Cherry', icon: '🍒' },
    { name: 'Flower', icon: '🌸' },
    { name: 'Peace', icon: '✌️' },
    { name: 'Party', icon: '🎉' },
    { name: 'Fire', icon: '🔥' }
  ];

  // Add Sticker to Center of Canvas
  const handleAddSticker = (icon: string, name: string) => {
    const newSticker: StickerItem = {
      id: `stk_${Date.now()}`,
      name,
      icon,
      x: 363, // center of 726px width
      y: 512, // center of 1024px height
      size: 48
    };
    setStickers((prev) => [...prev, newSticker]);
  };

  // Remove Sticker
  const handleRemoveSticker = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  // Dragging handlers (Pointer events support Touch and Mouse)
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingStickerId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (id: string, e: React.PointerEvent) => {
    if (draggingStickerId !== id || !previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();

    // Map pointer coordinate to 726 x 1024 canvas space
    const xRatio = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    const yRatio = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));

    const newX = Math.round(xRatio * 726);
    const newY = Math.round(yRatio * 1024);

    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, x: newX, y: newY } : s))
    );
  };

  const handlePointerUp = (id: string, e: React.PointerEvent) => {
    if (draggingStickerId === id) {
      setDraggingStickerId(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Dynamic CSS filter style for live interactive preview
  const getFilterStyle = (): React.CSSProperties => {
    const { filter, brightness, contrast, saturation } = editState;
    let filterString = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;

    if (filter === 'bw') {
      filterString += ' grayscale(100%)';
    } else if (filter === 'warm') {
      filterString += ' sepia(25%) saturate(120%)';
    } else if (filter === 'cool') {
      filterString += ' hue-rotate(180deg) saturate(85%)';
    } else if (filter === 'vintage') {
      filterString += ' sepia(45%) contrast(110%)';
    }

    return {
      filter: filterString,
      transform: `rotate(${editState.rotation}deg)`
    };
  };

  const canvasW = template?.canvas_width || 726;
  const canvasH = template?.canvas_height || 1024;

  return (
    <div className="flex-1 flex flex-col min-h-0 justify-between px-6 py-3 max-w-7xl mx-auto w-full select-none animate-pop">
      {/* Title */}
      <div className="text-center mb-2 flex-shrink-0">
        <h2 className="text-3xl font-black text-korean-charcoal tracking-tight">
          {t.editorTitle}
        </h2>
        <p className="text-sm text-neutral-500 font-medium">
          {t.editorSubtitle}
        </p>
      </div>

      {/* Editor Body: Left Canvas Preview, Right Toolbar */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6 items-center justify-center my-auto overflow-hidden">
        {/* WYSIWYG Live Canvas Preview (Exact 4x6 / 726x1024 proportion) */}
        <div className="relative flex items-center justify-center p-3 bg-white rounded-3xl border-2 border-cream-200 shadow-soft max-h-[58vh] h-full overflow-hidden">
          <div
            ref={previewContainerRef}
            className="relative rounded-2xl shadow-inner overflow-hidden select-none"
            style={{
              aspectRatio: `${canvasW} / ${canvasH}`,
              height: '100%',
              maxHeight: '52vh',
              backgroundColor: '#FAF9F6'
            }}
          >
            {/* 1. Underlying Captured Photos in Slots */}
            {slots.map((slot, i) => {
              const photoIdx = (slotAssignments && slotAssignments[i] !== undefined)
                ? slotAssignments[i]
                : (slot.shotIndex !== undefined ? slot.shotIndex : i);
              const photo = capturedPhotos[photoIdx] || capturedPhotos[0];
              const imgSrc = photo?.dataUrl || (photo?.file_path ? `/storage/sessions/${photo.session_id}/captured/${photo.original_filename}` : '');

              const leftPct = (slot.x / canvasW) * 100;
              const topPct = (slot.y / canvasH) * 100;
              const widthPct = (slot.width / canvasW) * 100;
              const heightPct = (slot.height / canvasH) * 100;

              return (
                <div
                  key={i}
                  className="absolute overflow-hidden bg-neutral-200"
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    borderRadius: slot.radius ? `${slot.radius * 0.4}px` : 0
                  }}
                >
                  {imgSrc && (
                    <img
                      src={imgSrc}
                      alt={`Slot ${i}`}
                      style={getFilterStyle()}
                      className="w-full h-full object-cover scale-x-[-1] pointer-events-none"
                    />
                  )}
                </div>
              );
            })}

            {/* 2. Real Template Frame Overlay on top of photos */}
            {template && (
              <img
                src={template.overlay_url || template.frame_url}
                alt={template.name_en}
                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
              />
            )}

            {/* 3. Draggable Stickers Layer on top */}
            {stickers.map((stk) => {
              const leftPct = (stk.x / canvasW) * 100;
              const topPct = (stk.y / canvasH) * 100;
              const isDragging = draggingStickerId === stk.id;

              return (
                <div
                  key={stk.id}
                  onPointerDown={(e) => handlePointerDown(stk.id, e)}
                  onPointerMove={(e) => handlePointerMove(stk.id, e)}
                  onPointerUp={(e) => handlePointerUp(stk.id, e)}
                  className={`absolute z-20 cursor-grab active:cursor-grabbing touch-none -translate-x-1/2 -translate-y-1/2 group transition-transform ${
                    isDragging ? 'scale-125' : 'hover:scale-110'
                  }`}
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <span className="text-3xl md:text-4xl select-none block pointer-events-none filter drop-shadow-md">
                    {stk.icon}
                  </span>

                  {/* Remove Button on sticker */}
                  <button
                    onClick={(e) => handleRemoveSticker(stk.id, e)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shadow-touch cursor-pointer opacity-80 group-hover:opacity-100"
                    title="ลบสติกเกอร์"
                  >
                    <X className="w-3 h-3 stroke-[3]" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Editor Controls Panel */}
        <div className="w-full md:w-[480px] bg-white rounded-3xl border-2 border-cream-200 shadow-soft p-5 flex flex-col justify-between max-h-[58vh]">
          {/* Navigation Tabs (Text Removed) */}
          <div className="flex items-center gap-1.5 p-1 bg-cream-100 rounded-2xl mb-4">
            <button
              onClick={() => setActiveTab('filter')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'filter' ? 'bg-white text-korean-charcoal shadow-soft' : 'text-neutral-500'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.filters}</span>
            </button>

            <button
              onClick={() => setActiveTab('adjust')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'adjust' ? 'bg-white text-korean-charcoal shadow-soft' : 'text-neutral-500'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>{t.adjustments}</span>
            </button>

            <button
              onClick={() => setActiveTab('stickers')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'stickers' ? 'bg-white text-korean-charcoal shadow-soft' : 'text-neutral-500'
              }`}
            >
              <Smile className="w-4 h-4" />
              <span>{t.stickers} (ลากเลื่อนได้)</span>
            </button>
          </div>

          {/* Tab 1: Filters */}
          {activeTab === 'filter' && (
            <div className="flex flex-col gap-3 my-auto">
              <div className="grid grid-cols-2 gap-3">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setEditState((prev) => ({ ...prev, filter: f.id }))}
                    className={`py-3.5 px-4 rounded-2xl font-bold text-sm transition-all text-center border-2 cursor-pointer active:scale-95 ${
                      editState.filter === f.id
                        ? 'bg-korean-charcoal text-white border-korean-charcoal shadow-touch'
                        : 'bg-cream-50 text-neutral-700 border-cream-200 hover:bg-cream-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Rotate Tool */}
              <button
                onClick={() =>
                  setEditState((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))
                }
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-cream-100 hover:bg-cream-200 text-neutral-800 font-bold text-sm cursor-pointer active:scale-95 mt-2"
              >
                <RotateCw className="w-4 h-4" />
                <span>{t.rotate} ({editState.rotation}°)</span>
              </button>
            </div>
          )}

          {/* Tab 2: Adjustments */}
          {activeTab === 'adjust' && (
            <div className="flex flex-col gap-4 my-auto">
              {/* Brightness */}
              <div>
                <div className="flex justify-between text-xs font-bold text-neutral-600 mb-1.5">
                  <span className="flex items-center gap-1"><Sun className="w-4 h-4" /> {t.brightness}</span>
                  <span>{Math.round(editState.brightness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.05"
                  value={editState.brightness}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, brightness: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-korean-charcoal h-2 bg-cream-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between text-xs font-bold text-neutral-600 mb-1.5">
                  <span className="flex items-center gap-1"><Contrast className="w-4 h-4" /> {t.contrast}</span>
                  <span>{Math.round(editState.contrast * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.05"
                  value={editState.contrast}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, contrast: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-korean-charcoal h-2 bg-cream-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between text-xs font-bold text-neutral-600 mb-1.5">
                  <span className="flex items-center gap-1"><Palette className="w-4 h-4" /> {t.saturation}</span>
                  <span>{Math.round(editState.saturation * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.8"
                  step="0.1"
                  value={editState.saturation}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, saturation: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-korean-charcoal h-2 bg-cream-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Stickers (Draggable) */}
          {activeTab === 'stickers' && (
            <div className="flex flex-col gap-3 my-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  แตะเพื่อเพิ่มสติกเกอร์ (แล้วแตะลากบนรูปได้เลย)
                </span>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Move className="w-3.5 h-3.5" /> ลากวางได้อิสระ
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                {availableStickers.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddSticker(s.icon, s.name)}
                    className="p-3 text-3xl rounded-2xl bg-cream-50 hover:bg-cream-100 border border-cream-200 cursor-pointer active:scale-95 transition-all flex items-center justify-center shadow-soft"
                  >
                    {s.icon}
                  </button>
                ))}
              </div>

              {stickers.length > 0 && (
                <div className="text-xs text-neutral-500 mt-2 bg-cream-100 p-2.5 rounded-xl">
                  วางแล้ว {stickers.length} ชิ้น • สามารถใช้นิ้วแตะลากสติกเกอร์ไปวางตำแหน่งใดก็ได้ หรือแตะกากบาทสีแดงบนสติกเกอร์เพื่อลบ
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex-shrink-0 flex items-center justify-between mt-2 pt-2 border-t border-cream-200">
        <TouchButton
          variant="secondary"
          size="lg"
          onClick={() => setScreen('PHOTO_SELECT')}
          icon={<ArrowLeft className="w-5 h-5" />}
        >
          {t.back}
        </TouchButton>

        <TouchButton
          variant="primary"
          size="lg"
          disabled={isLoading}
          onClick={composeFinalPhoto}
          icon={<Sparkles className="w-5 h-5 text-korean-butter" />}
          className="px-8 shadow-touch"
        >
          {isLoading ? 'กำลังประมวลผลและพิมพ์...' : `เสร็จสิ้นและสั่งพิมพ์ภาพ (${copies} ใบ)`}
        </TouchButton>
      </div>
    </div>
  );
};
