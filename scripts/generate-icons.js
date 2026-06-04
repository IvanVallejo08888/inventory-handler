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

(async () => {
  for (const size of pwaSizes) {
    await generateIcon(size, `icon-${size}x${size}.png`);
  }
  await generateIcon(180, 'apple-touch-icon.png');
  await generateIcon(32, 'favicon-32x32.png');
  await generateIcon(16, 'favicon-16x16.png');
  console.log('Iconos generados en public/icons/');
})();
