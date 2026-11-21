import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { getSessionDir } from '../config/paths.js';

export interface PhotoSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  shotIndex?: number;
}

export interface PhotoEditOptions {
  filter?: 'original' | 'bw' | 'warm' | 'cool' | 'vintage';
  brightness?: number; // 0.5 to 1.5, 1.0 is default
  contrast?: number;   // 0.5 to 1.5, 1.0 is default
  saturation?: number; // 0.0 to 2.0, 1.0 is default
  rotation?: number;   // 0, 90, 180, 270
}

export interface StickerOverlay {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  svgData?: string;
  url?: string;
}

export interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
}

export interface CompositionConfig {
  sessionId: string;
  templateId?: number;
  mode: 'strip' | 'single' | 'collage' | 'group';
  canvasWidth: number;
  canvasHeight: number;
  bgColor: string;
  borderColor?: string;
  borderWidth?: number;
  slots: PhotoSlot[];
  photos: Array<{
    filePath: string;
    editOptions?: PhotoEditOptions;
  }>;
  brandText?: string;
  dateText?: string;
  stickers?: StickerOverlay[];
  textOverlays?: TextOverlay[];
  overlayImagePath?: string;
  logoPath?: string;
  dpi?: number;
}

export interface CompositionResult {
  jpgPath: string;
  pngPath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  dpi: number;
}

/**
 * Apply filters, color adjustments, and cropping to a single photo slot
 */
async function processSlotImage(
  photoPath: string,
  slot: PhotoSlot,
  editOptions: PhotoEditOptions = {}
): Promise<Buffer> {
  let pipeline = sharp(photoPath);

  // 1. Rotation if specified
  if (editOptions.rotation && editOptions.rotation !== 0) {
    pipeline = pipeline.rotate(editOptions.rotation);
  }

  // 2. Brightness & Saturation adjustments
  const brightness = editOptions.brightness ?? 1.0;
  const saturation = editOptions.saturation ?? 1.0;
  if (brightness !== 1.0 || saturation !== 1.0) {
    pipeline = pipeline.modulate({
      brightness: Math.max(0.5, Math.min(2.0, brightness)),
      saturation: Math.max(0.0, Math.min(2.0, saturation))
    });
  }

  // 3. Preset filters
  const filter = editOptions.filter || 'original';
  if (filter === 'bw') {
    pipeline = pipeline.greyscale();
  } else if (filter === 'warm') {
    // Warm tone: slight increase in red/yellow tones
    pipeline = pipeline.tint({ r: 255, g: 235, b: 205 });
  } else if (filter === 'cool') {
    // Cool tone: slight cyan/blue wash
    pipeline = pipeline.tint({ r: 220, g: 235, b: 255 });
  } else if (filter === 'vintage') {
    // Vintage film: desaturate slightly and sepia tint
    pipeline = pipeline
      .modulate({ saturation: 0.75, brightness: 1.05 })
      .tint({ r: 245, g: 220, b: 185 });
  }

  // 4. Resize and center-crop to fit slot without stretching
  pipeline = pipeline.resize(slot.width, slot.height, {
    fit: 'cover',
    position: 'centre'
  });

  // 5. Rounded corners mask if radius > 0
  if (slot.radius && slot.radius > 0) {
    const maskSvg = Buffer.from(`
      <svg width="${slot.width}" height="${slot.height}">
        <rect x="0" y="0" width="${slot.width}" height="${slot.height}" rx="${slot.radius}" ry="${slot.radius}" fill="#ffffff"/>
      </svg>
    `);
    pipeline = pipeline.composite([
      {
        input: maskSvg,
        blend: 'dest-in'
      }
    ]);
  }

  return await pipeline.png().toBuffer();
}

/**
 * Generate SVG text elements for branding, dates, and custom text
 */
function generateOverlaysSvg(
  width: number,
  height: number,
  brandText?: string,
  dateText?: string,
  textOverlays?: TextOverlay[],
  stickers?: StickerOverlay[]
): string {
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Standard brand header/footer if present
  if (brandText) {
    const yPos = height - 45;
    svg += `
      <text x="${width / 2}" y="${yPos}" 
            font-family="'Plus Jakarta Sans', 'Prompt', sans-serif" 
            font-size="20" font-weight="700" letter-spacing="4"
            text-anchor="middle" fill="#2D2D2D">
        ${escapeXml(brandText.toUpperCase())}
      </text>
    `;
  }

  if (dateText) {
    const yPos = height - 20;
    svg += `
      <text x="${width / 2}" y="${yPos}" 
            font-family="'Plus Jakarta Sans', 'Prompt', sans-serif" 
            font-size="13" font-weight="500" letter-spacing="2"
            text-anchor="middle" fill="#888888">
        ${escapeXml(dateText)}
      </text>
    `;
  }

  // Custom text overlays
  if (textOverlays && textOverlays.length > 0) {
    for (const t of textOverlays) {
      const anchor = t.align === 'center' ? 'middle' : t.align === 'right' ? 'end' : 'start';
      svg += `
        <text x="${t.x}" y="${t.y}" 
              font-family="'Plus Jakarta Sans', 'Prompt', sans-serif" 
              font-size="${t.fontSize}" font-weight="600"
              text-anchor="${anchor}" fill="${t.color}">
          ${escapeXml(t.text)}
        </text>
      `;
    }
  }

  // Custom stickers
  if (stickers && stickers.length > 0) {
    for (const s of stickers) {
      if (s.svgData) {
        svg += `
          <g transform="translate(${s.x}, ${s.y})">
            ${s.svgData}
          </g>
        `;
      } else {
        const icon = (s as any).icon || s.name || '✨';
        const size = s.height || (s as any).size || 40;
        svg += `
          <text x="${s.x}" y="${s.y}" font-size="${size}" text-anchor="middle" dominant-baseline="central">
            ${escapeXml(icon)}
          </text>
        `;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Main Image Composition Engine
 */
export async function composePhoto(config: CompositionConfig): Promise<CompositionResult> {
  const {
    sessionId,
    canvasWidth,
    canvasHeight,
    bgColor,
    borderColor,
    borderWidth = 1,
    slots,
    photos,
    overlayImagePath,
    brandText = config.overlayImagePath ? '' : 'HARU PHOTO BOOTH',
    dateText = config.overlayImagePath ? '' : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    stickers = [],
    textOverlays = [],
    logoPath,
    dpi = 300
  } = config;

  const sessionDirs = getSessionDir(sessionId);
  const timestamp = Date.now();
  const jpgFilename = `final_${sessionId}_${timestamp}.jpg`;
  const pngFilename = `final_${sessionId}_${timestamp}.png`;
  const thumbFilename = `thumb_${sessionId}_${timestamp}.jpg`;

  const jpgPath = path.join(sessionDirs.final, jpgFilename);
  const pngPath = path.join(sessionDirs.final, pngFilename);
  const thumbnailPath = path.join(sessionDirs.final, thumbFilename);

  // 1. Create base canvas with background color
  const baseCanvas = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: bgColor || '#FAF9F6'
    }
  });

  const compositeOperations: sharp.OverlayOptions[] = [];

  // 2. Add border if configured
  if (borderColor && borderWidth > 0) {
    const borderSvg = Buffer.from(`
      <svg width="${canvasWidth}" height="${canvasHeight}">
        <rect x="${borderWidth / 2}" y="${borderWidth / 2}" 
              width="${canvasWidth - borderWidth}" height="${canvasHeight - borderWidth}" 
              fill="none" stroke="${borderColor}" stroke-width="${borderWidth}"/>
      </svg>
    `);
    compositeOperations.push({ input: borderSvg, top: 0, left: 0 });
  }

  // 3. Process each photo into its slot
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const photoIdx = slot.shotIndex !== undefined ? slot.shotIndex : i;
    const photo = photos[photoIdx] || photos[0]; // fallback to first photo if fewer available
    if (photo && fs.existsSync(photo.filePath)) {
      const processedSlotBuffer = await processSlotImage(
        photo.filePath,
        slot,
        photo.editOptions
      );
      compositeOperations.push({
        input: processedSlotBuffer,
        top: Math.round(slot.y),
        left: Math.round(slot.x)
      });
    }
  }

  // 4. Logo overlay if exists
  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = await sharp(logoPath)
      .resize({ width: 120, height: 40, fit: 'inside' })
      .toBuffer();
    compositeOperations.push({
      input: logoBuffer,
      top: canvasHeight - 70,
      left: Math.round((canvasWidth - 120) / 2)
    });
  }

  // 5. Template overlay graphic if exists
  if (overlayImagePath && fs.existsSync(overlayImagePath)) {
    const overlayBuffer = await sharp(overlayImagePath)
      .resize(canvasWidth, canvasHeight, { fit: 'fill' })
      .png()
      .toBuffer();
    compositeOperations.push({ input: overlayBuffer, top: 0, left: 0 });
  }

  // 6. SVG typography, stickers, and labels
  const svgOverlay = generateOverlaysSvg(
    canvasWidth,
    canvasHeight,
    brandText,
    dateText,
    textOverlays,
    stickers
  );
  compositeOperations.push({
    input: Buffer.from(svgOverlay),
    top: 0,
    left: 0
  });

  // 7. Render high-resolution composition
  const composedPipeline = baseCanvas.composite(compositeOperations);

  // Save PNG with 300 DPI
  await composedPipeline
    .clone()
    .withMetadata({ density: dpi })
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(pngPath);

  // Save JPG with 300 DPI
  await composedPipeline
    .clone()
    .withMetadata({ density: dpi })
    .jpeg({ quality: 96, mozjpeg: true })
    .toFile(jpgPath);

  // Save Fast Preview Thumbnail
  const thumbWidth = Math.min(canvasWidth, 480);
  await sharp(jpgPath)
    .resize({ width: thumbWidth })
    .jpeg({ quality: 85 })
    .toFile(thumbnailPath);

  return {
    jpgPath,
    pngPath,
    thumbnailPath,
    width: canvasWidth,
    height: canvasHeight,
    dpi
  };
}

/**
 * 1. Photo Strip Composition (4 photos vertical or horizontal)
 */
export async function composePhotoStrip(
  sessionId: string,
  photos: Array<{ filePath: string; editOptions?: PhotoEditOptions }>,
  orientation: 'vertical' | 'horizontal' = 'vertical',
  bgColor = '#FAF9F6',
  brandText = 'HARU PHOTO BOOTH'
): Promise<CompositionResult> {
  const isVertical = orientation === 'vertical';
  const canvasWidth = isVertical ? 600 : 1800;
  const canvasHeight = isVertical ? 1800 : 600;

  const slots: PhotoSlot[] = [];
  if (isVertical) {
    const slotW = 520;
    const slotH = 380;
    const startX = 40;
    const gap = 30;
    for (let i = 0; i < 4; i++) {
      slots.push({
        x: startX,
        y: 45 + i * (slotH + gap),
        width: slotW,
        height: slotH,
        radius: 12
      });
    }
  } else {
    const slotW = 380;
    const slotH = 480;
    const startY = 40;
    const gap = 30;
    for (let i = 0; i < 4; i++) {
      slots.push({
        x: 40 + i * (slotW + gap),
        y: startY,
        width: slotW,
        height: slotH,
        radius: 12
      });
    }
  }

  return await composePhoto({
    sessionId,
    mode: 'strip',
    canvasWidth,
    canvasHeight,
    bgColor,
    borderColor: '#E8E3D9',
    borderWidth: 2,
    slots,
    photos,
    brandText
  });
}

/**
 * 2. Single Photo Portrait Composition
 */
export async function composeSinglePhoto(
  sessionId: string,
  photo: { filePath: string; editOptions?: PhotoEditOptions },
  bgColor = '#FAF9F6',
  brandText = 'HARU PHOTO BOOTH'
): Promise<CompositionResult> {
  const canvasWidth = 1200;
  const canvasHeight = 1600;

  const slots: PhotoSlot[] = [
    {
      x: 75,
      y: 75,
      width: 1050,
      height: 1350,
      radius: 20
    }
  ];

  return await composePhoto({
    sessionId,
    mode: 'single',
    canvasWidth,
    canvasHeight,
    bgColor,
    borderColor: '#EAE6DF',
    borderWidth: 2,
    slots,
    photos: [photo],
    brandText
  });
}

/**
 * 3. Photo Collage Composition (2x2 grid)
 */
export async function composeCollage(
  sessionId: string,
  photos: Array<{ filePath: string; editOptions?: PhotoEditOptions }>,
  bgColor = '#FAF9F6',
  brandText = 'HARU PHOTO BOOTH'
): Promise<CompositionResult> {
  const canvasWidth = 1200;
  const canvasHeight = 1400;

  const slotW = 525;
  const slotH = 580;
  const slots: PhotoSlot[] = [
    { x: 50, y: 50, width: slotW, height: slotH, radius: 16 },
    { x: 625, y: 50, width: slotW, height: slotH, radius: 16 },
    { x: 50, y: 680, width: slotW, height: slotH, radius: 16 },
    { x: 625, y: 680, width: slotW, height: slotH, radius: 16 }
  ];

  return await composePhoto({
    sessionId,
    mode: 'collage',
    canvasWidth,
    canvasHeight,
    bgColor,
    borderColor: '#E8E3D9',
    borderWidth: 2,
    slots,
    photos,
    brandText
  });
}

/**
 * 4. Group Photo Composition (Wide 3-frame layout)
 */
export async function composeGroupPhoto(
  sessionId: string,
  photos: Array<{ filePath: string; editOptions?: PhotoEditOptions }>,
  bgColor = '#FAF9F6',
  brandText = 'HARU PHOTO BOOTH'
): Promise<CompositionResult> {
  const canvasWidth = 1800;
  const canvasHeight = 1200;

  const slotW = 520;
  const slotH = 960;
  const slots: PhotoSlot[] = [
    { x: 60, y: 60, width: slotW, height: slotH, radius: 16 },
    { x: 640, y: 60, width: slotW, height: slotH, radius: 16 },
    { x: 1220, y: 60, width: slotW, height: slotH, radius: 16 }
  ];

  return await composePhoto({
    sessionId,
    mode: 'group',
    canvasWidth,
    canvasHeight,
    bgColor,
    borderColor: '#E8E3D9',
    borderWidth: 2,
    slots,
    photos,
    brandText
  });
}
