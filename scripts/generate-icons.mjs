import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'static/icons/app.svg';
const OUT = 'static/icons-gen';

const sizes = [48,72,96,128,144,152,180,192,256,384,512];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

// Für maskable-Icons etwas Puffer (safe zone), z.B. ~10%
function resizeOpts(size) {
  const pad = Math.round(size * 0.1);
  return {
    width: size - pad,
    height: size - pad,
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  };
}

async function generate() {
  await ensureDir(OUT);

  for (const size of sizes) {
    // "any"
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
      .png()
      .toFile(path.join(OUT, `icon-${size}.png`));

    // "maskable" (mit kleinerem Inhalt + Transparenz)
    await sharp(SRC)
      .resize(resizeOpts(size))
      .png()
      .extend({ top: 0, bottom: 0, left: 0, right: 0, background: { r:0, g:0, b:0, alpha:0 } })
      .toFile(path.join(OUT, `maskable-icon-${size}.png`));
  }

  // Apple Touch Icon (iOS, 180x180 als Standard)
  // iOS ignoriert Manifest-Icons häufig, daher zusätzlich als Link-Tag referenzieren.
  await sharp(SRC)
    .resize(180, 180, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
    .png()
    .toFile(path.join(OUT, `apple-touch-icon-180.png`));

  console.log('✅ PNG icons generated in', OUT);
}

generate().catch((e) => {
  console.error('Icon generation failed:', e);
  process.exit(1);
});
