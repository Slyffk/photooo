import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { GifWriter } from 'omggif';
import { getSessionDir } from '../config/paths.js';

export interface GifOptions {
  width?: number;
  height?: number;
  delayCentiseconds?: number; // 40 = 400ms per frame
  boomerang?: boolean;
}

// Pre-computed standard 256-color web palette (3-bit Red, 3-bit Green, 2-bit Blue)
const PALETTE_256: number[] = new Array(256);
for (let i = 0; i < 256; i++) {
  const r = Math.round(((i >> 5) & 7) * (255 / 7));
  const g = Math.round(((i >> 2) & 7) * (255 / 7));
  const b = Math.round((i & 3) * (255 / 3));
  PALETTE_256[i] = (r << 16) | (g << 8) | b;
}

/**
 * Quantize RGB buffer to 256 indexed palette
 */
function quantizeRgbToPalette(rgbData: Buffer, pixelCount: number): Uint8Array {
  const indexed = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const r = rgbData[i * 3];
    const g = rgbData[i * 3 + 1];
    const b = rgbData[i * 3 + 2];
    const rIdx = Math.round(r * (7 / 255));
    const gIdx = Math.round(g * (7 / 255));
    const bIdx = Math.round(b * (3 / 255));
    indexed[i] = (rIdx << 5) | (gIdx << 2) | bIdx;
  }
  return indexed;
}

/**
 * Generate a looping Boomerang GIF from a list of captured photo file paths
 */
export async function generateSessionGif(
  sessionId: string,
  photoPaths: string[],
  options: GifOptions = {}
): Promise<{ gifPath: string; filename: string }> {
  const {
    width = 480,
    height = 360,
    delayCentiseconds = 45, // 450ms per frame
    boomerang = true
  } = options;

  const validPaths = photoPaths.filter((p) => p && fs.existsSync(p));
  if (validPaths.length === 0) {
    throw new Error('No valid photo files provided for GIF generation');
  }

  // 1. Process frames into quantized indexed arrays
  const indexedFrames: Uint8Array[] = [];
  const pixelCount = width * height;

  for (const filePath of validPaths) {
    const { data } = await sharp(filePath)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const indexed = quantizeRgbToPalette(data, pixelCount);
    indexedFrames.push(indexed);
  }

  // 2. Build sequence (Boomerang: 0 -> 1 -> 2 -> 1)
  let sequence: Uint8Array[] = [...indexedFrames];
  if (boomerang && indexedFrames.length > 2) {
    const reverseFrames = indexedFrames.slice(1, -1).reverse();
    sequence = sequence.concat(reverseFrames);
  }

  // 3. Encode into animated GIF using omggif
  const bufferSize = width * height * sequence.length * 2 + 1024;
  const outBuffer = Buffer.alloc(Math.max(bufferSize, 2 * 1024 * 1024));
  const writer = new GifWriter(outBuffer, width, height, { loop: 0 }); // 0 = infinite loop

  for (const frameData of sequence) {
    (writer as any).addFrame(0, 0, width, height, frameData, {
      palette: PALETTE_256,
      delay: delayCentiseconds
    });
  }

  const finalLength = writer.end();
  const gifData = outBuffer.subarray(0, finalLength);

  // 4. Save to session final directory
  const sessionDirs = getSessionDir(sessionId);
  const timestamp = Date.now();
  const filename = `animation_${sessionId}_${timestamp}.gif`;
  const gifPath = path.join(sessionDirs.final, filename);

  fs.writeFileSync(gifPath, gifData);

  return { gifPath, filename };
}
