// Script to generate PWA icons from SVG using canvas
// Run: node scripts/generateIcons.mjs
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

function drawIcon(size, maskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const pad = maskable ? size * 0.1 : 0;

  // Background
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#0d0d14');
  bg.addColorStop(1, '#12082a');
  ctx.fillStyle = bg;
  if (maskable) {
    ctx.fillRect(0, 0, size, size);
  } else {
    const r = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size); ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath(); ctx.fill();
  }

  // Gradient overlay
  const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
  glow.addColorStop(0, 'rgba(124,58,237,0.35)');
  glow.addColorStop(1, 'rgba(236,72,153,0.1)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Music note symbol
  const s = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const scale = s / 100;

  // Draw stylized "M" wave / music bars
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = scale * 5;
  ctx.lineCap = 'round';

  // Three sound bars
  const bars = [
    { x: cx - 22 * scale, h: 28 * scale },
    { x: cx, h: 42 * scale },
    { x: cx + 22 * scale, h: 20 * scale },
  ];
  bars.forEach(({ x, h }) => {
    ctx.beginPath();
    ctx.moveTo(x, cy + h / 2);
    ctx.lineTo(x, cy - h / 2);
    ctx.stroke();
  });

  // Quarter note head for the tallest bar
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const noteX = cx + 22 * scale + 14 * scale;
  const noteY = cy - 8 * scale;
  ctx.beginPath();
  ctx.ellipse(noteX, noteY + 8 * scale, 6 * scale, 4 * scale, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = scale * 3;
  ctx.beginPath();
  ctx.moveTo(noteX + 5 * scale, noteY + 6 * scale);
  ctx.lineTo(noteX + 5 * scale, noteY - 18 * scale);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

for (const size of SIZES) {
  const buf = drawIcon(size, size === 512);
  const fileName = `icon-${size}.png`;
  writeFileSync(join(outDir, fileName), buf);
  console.log(`✓ Generated ${fileName}`);
}

console.log('\nAll icons generated in public/icons/');
