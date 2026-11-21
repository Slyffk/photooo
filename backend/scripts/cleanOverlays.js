const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const configPath = path.resolve(__dirname, '../../database/new_templates.json');
const templates = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function isPlaceholder(r, g, b) {
  // 1. Sky blue (e.g. RGB(190, 225, 250), RGB(160, 210, 245), RGB(210, 235, 252))
  if (b > 170 && g > 160 && (b >= r || b > g * 0.95)) return true;
  if (b > 140 && g > 165 && b > r * 1.05) return true;

  // 2. White / very light clouds (e.g. RGB(245, 250, 255), RGB(235, 245, 250))
  if (r > 215 && g > 225 && b > 230) return true;
  if (r > 235 && g > 235 && b > 235) return true;

  // 3. Green hills / grass (Canva placeholder hills):
  // Light lime green: RGB(197, 224, 131)
  // Dark green: RGB(137, 161, 1), RGB(120, 150, 20), RGB(100, 130, 10)
  // Medium olive green: RGB(160, 190, 40)
  if (g > 65 && g > b + 15 && (g > r * 0.85 || (g > 110 && g > b * 1.25))) return true;
  if (g > 85 && b < 140 && g > b * 1.2 && (r < 225)) return true;

  return false;
}

async function regenerate() {
  for (const t of templates) {
    const srcFile = path.resolve(__dirname, '../../storage/templates', t.source);
    const outFile = path.resolve(__dirname, '../../storage/templates', t.overlay);
    if (!fs.existsSync(srcFile)) {
      console.log('Source missing:', srcFile);
      continue;
    }

    const img = sharp(srcFile);
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.alloc(info.width * info.height * 4);

    let cutoutCount = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const srcIdx = (y * info.width + x) * 3;
        const dstIdx = (y * info.width + x) * 4;
        const r = data[srcIdx];
        const g = data[srcIdx + 1];
        const b = data[srcIdx + 2];

        // Check if inside any slot
        const inSlot = t.slots.some((s) => {
          return x >= (s.x - 2) && x < (s.x + s.width + 2) && y >= (s.y - 2) && y < (s.y + s.height + 2);
        });

        if (inSlot && isPlaceholder(r, g, b)) {
          out[dstIdx] = r;
          out[dstIdx + 1] = g;
          out[dstIdx + 2] = b;
          out[dstIdx + 3] = 0; // 100% TRANSPARENT
          cutoutCount++;
        } else {
          out[dstIdx] = r;
          out[dstIdx + 1] = g;
          out[dstIdx + 2] = b;
          out[dstIdx + 3] = 255; // Keep frame, stickers, background
        }
      }
    }

    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile(outFile);

    console.log('Saved clean overlay:', t.overlay, 'Cutout pixels:', cutoutCount);
  }
}

regenerate().then(() => console.log('All overlays regenerated successfully!')).catch(console.error);
