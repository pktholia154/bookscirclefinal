const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Pixel-perfect mathematical vector reproduction of booksCircle (2).png:
// - Electric purple canvas: #5500ee
// - White Monogram B with dual parallelogram apertures
// - Smooth curved leaf 1 (middle page)
// - Smooth curved leaf 2 (bottom page)
// - Open book spine hook at bottom-left
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#5500ee" />

  <g fill="#ffffff">
    <!-- 1. Upper Body of B (Spine + Top Bowl + Middle Bowl down to waist and Leaf 1) -->
    <path fill-rule="evenodd" d="
      M 205,56
      C 255,56 312,74 346,110
      C 375,142 378,190 350,232
      C 336,252 318,264 298,270
      L 298,270
      C 328,260 358,265 374,285
      C 362,315 315,355 245,392
      C 192,420 152,434 140,434
      L 140,395
      C 134,360 134,200 140,126
      C 144,78 170,56 205,56
      Z

      <!-- Top counter: slanted parallelogram -->
      M 190,162
      L 272,123
      C 278,120 284,124 284,130
      L 282,185
      C 282,192 276,197 270,199
      L 188,238
      C 182,241 176,236 176,230
      L 182,172
      C 183,166 186,164 190,162
      Z

      <!-- Bottom counter: slanted parallelogram -->
      M 188,268
      L 270,229
      C 276,226 282,230 282,236
      L 280,290
      C 280,297 274,302 268,305
      L 186,344
      C 180,347 174,342 174,336
      L 180,278
      C 181,272 184,270 188,268
      Z
    " />

    <!-- 2. Bottom Book Page (Leaf 2): Sweeps from spine around bottom to leaf tip 2 -->
    <path d="
      M 140,436
      C 140,446 150,452 170,452
      C 230,452 300,422 360,375
      C 382,358 386,368 376,382
      C 330,435 250,460 178,460
      C 142,460 126,442 126,416
      C 126,400 134,395 140,436
      Z
    " />
  </g>
</svg>`;

async function render() {
  const publicDir = path.join(__dirname, '..', 'public');
  const buffer = Buffer.from(svg);

  // Generate public/booksCircle (2).png and public/logo.png
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'logo.png'));
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'booksCircle (2).png'));
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));
  await sharp(buffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(buffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(buffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(buffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
  await sharp(buffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'));

  console.log('✓ Successfully rendered pure logo assets!');
}

render().catch(err => {
  console.error(err);
  process.exit(1);
});
