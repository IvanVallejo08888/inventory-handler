const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

function buildSvg(size) {
  const r = Math.round(size * 0.375);
  const cx = size / 2;
  const cy = size / 2;
  const fontSize = Math.round(size * 0.354);
  const textY = Math.round(size * 0.615);
  const strokeW = Math.max(2, Math.round(size * 0.013));
  const blur = Math.max(2, Math.round(size * 0.016));
  const rx = Math.round(size * 0.208);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#1aaa52"/>
      <stop offset="100%" stop-color="#0d4f28"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${blur}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" fill="#0a0f0a"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#bg)" stroke="#2dce6b" stroke-width="${strokeW}"/>
  <text x="${cx}" y="${textY}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    fill="#5de68a"
    text-anchor="middle"
    filter="url(#glow)"
    letter-spacing="-${Math.round(size * 0.015)}">17</text>
</svg>`;
}

async function generateIcon(size, filename) {
  const svg = Buffer.from(buildSvg(size));
  const dest = path.join(iconsDir, filename);
  await sharp(svg).png().toFile(dest);
  console.log(`✓ ${filename} (${size}x${size})`);
}

(async () => {
  await generateIcon(192, 'icon-192x192.png');
  await generateIcon(512, 'icon-512x512.png');
  await generateIcon(180, 'apple-touch-icon.png');
  console.log('Iconos generados en public/icons/');
})();
