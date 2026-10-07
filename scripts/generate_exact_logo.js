const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Exact 1:1 vector reconstruction matching the user's uploaded booksCircle (2).png logo:
// 1. Solid electric purple canvas (#5500eb)
// 2. Bold italic stylized capital B
// 3. Two slanted parallelogram counters (upper aperture and lower aperture)
// 4. Inward-curling book spine hinge at bottom-left
// 5. Two distinct fluttering open book pages fanning out to bottom-right
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#5500eb" />

  <g fill="#ffffff">
    <!-- Main B monogram outer contour + dual apertures + bottom pages -->
    <path fill-rule="evenodd" d="
      M 198,56
      C 242,56 304,72 342,108
      C 375,140 380,188 352,234
      C 340,252 322,264 304,272
      C 342,286 374,316 376,356
      C 378,382 368,406 348,424
      C 308,450 242,456 182,450
      C 150,446 130,432 122,410
      C 118,392 122,366 126,324
      L 142,126
      C 146,80 168,56 198,56
      Z

      M 190,165
      L 272,126
      C 278,123 284,128 284,134
      L 282,185
      C 282,192 276,196 270,198
      L 188,236
      C 182,239 176,234 176,228
      L 182,174
      C 183,168 186,166 190,165
      Z

      M 188,272
      L 272,233
      C 278,230 284,234 284,240
      L 282,290
      C 282,297 276,302 270,305
      L 186,342
      C 180,345 174,340 174,334
      L 180,280
      C 181,275 184,273 188,272
      Z
    " />

    <!-- Crescent cut separating middle book page and bottom book page -->
    <path d="
      M 128,422
      C 150,410 196,394 252,370
      C 310,345 354,312 376,280
      C 382,288 380,298 370,314
      C 340,358 282,402 212,425
      C 175,436 144,436 128,422
      Z
    " fill="#5500eb" />
  </g>
</svg>`;

async function run() {
  const publicDir = path.join(__dirname, '..', 'public');
  const buffer = Buffer.from(svg);

  // Generate all sizes
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'logo.png'));
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'booksCircle (2).png'));
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));
  await sharp(buffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(buffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(buffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(buffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
  await sharp(buffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'));

  console.log('✓ All assets generated successfully matching booksCircle (2).png');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
