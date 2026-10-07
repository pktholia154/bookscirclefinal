const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// High-precision vector recreation matching the user's uploaded booksCircle (2).png:
// 1. Solid electric purple canvas (#5500eb)
// 2. Bold italic stylized Monogram B with dual slanted parallelogram counters
// 3. Open book spine curve at bottom-left
// 4. Two fanning curved book pages at the bottom-right with tapered tips
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Solid brand purple background -->
  <rect width="512" height="512" fill="#5500eb" />

  <g fill="#ffffff">
    <!-- Main B monogram with outer contours, dual counters, and open book pages -->
    <path fill-rule="evenodd" d="
      M 198,58
      C 238,58 302,74 340,110
      C 374,142 380,192 352,236
      C 340,254 322,266 304,274
      C 340,288 372,318 376,358
      C 378,382 368,406 348,424
      C 308,450 242,456 182,450
      C 150,446 130,432 122,410
      C 118,392 122,366 126,324
      L 142,126
      C 146,80 168,58 198,58
      Z

      M 190,165
      L 272,128
      C 278,125 284,130 284,136
      L 282,185
      C 282,192 276,196 270,198
      L 188,234
      C 182,237 176,232 176,226
      L 182,174
      C 183,168 186,166 190,165
      Z

      M 188,272
      L 270,235
      C 276,232 282,236 282,242
      L 280,290
      C 280,297 274,302 268,305
      L 186,340
      C 180,343 174,338 174,332
      L 180,280
      C 181,275 184,273 188,272
      Z
    " />

    <!-- Crescent cut separating middle book page and bottom book page -->
    <path d="
      M 130,422
      C 152,410 196,394 252,370
      C 310,345 354,312 376,280
      C 382,288 380,298 370,314
      C 340,358 282,402 212,425
      C 175,436 146,436 130,422
      Z
    " fill="#5500eb" />
  </g>
</svg>`;

async function render() {
  const publicDir = path.join(__dirname, '..', 'public');
  const buffer = Buffer.from(svg);

  // 1. logo.png (512x512)
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'logo.png'));
  console.log('✓ Rendered public/logo.png');

  // 2. icon-512.png (512x512)
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ Rendered public/icon-512.png');

  // 3. icon-maskable-512.png (512x512)
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('✓ Rendered public/icon-maskable-512.png');

  // 4. icon-192.png (192x192)
  await sharp(buffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ Rendered public/icon-192.png');

  // 5. apple-touch-icon.png (180x180)
  await sharp(buffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Rendered public/apple-touch-icon.png');

  // 6. favicon-32x32.png (32x32)
  await sharp(buffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ Rendered public/favicon-32x32.png');

  // 7. favicon-16x16.png (16x16)
  await sharp(buffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('✓ Rendered public/favicon-16x16.png');

  // 8. favicon.png (32x32)
  await sharp(buffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Rendered public/favicon.png');
}

render()
  .then(() => console.log('Successfully rendered all raster assets!'))
  .catch((err) => {
    console.error('Rendering error:', err);
    process.exit(1);
  });
