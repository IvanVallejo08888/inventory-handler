const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const source = path.join(__dirname, '..', 'public', 'logo-area17.png');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const pwaSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcon(size, filename) {
  const dest = path.join(iconsDir, filename);
  await sharp(source)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(dest);
  console.log(`✓ ${filename} (${size}x${size})`);
}

// Android/adaptive-icon launchers crop "maskable" icons to a centered ~80%
// safe zone before applying their own circle/squircle mask. A full-bleed icon
// gets its edges (and any text near the bottom) clipped off. So maskable
// icons need the artwork shrunk to the safe zone with the background color
// extended to the full canvas.
async function generateMaskableIcon(size, filename) {
  const dest = path.join(iconsDir, filename);
  const safeZone = Math.round(size * 0.8);
  const inner = await sharp(source).resize(safeZone, safeZone, { fit: 'cover' }).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(dest);
  console.log(`✓ ${filename} (${size}x${size}, maskable)`);
}

(async () => {
  for (const size of pwaSizes) {
    await generateIcon(size, `icon-${size}x${size}.png`);
  }
  await generateIcon(180, 'apple-touch-icon.png');
  await generateIcon(32, 'favicon-32x32.png');
  await generateIcon(16, 'favicon-16x16.png');
  await generateMaskableIcon(192, 'icon-192x192-maskable.png');
  await generateMaskableIcon(512, 'icon-512x512-maskable.png');
  console.log('Iconos generados en public/icons/');
})();
