const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Exact vector reproduction of the user's uploaded booksCircle (2).png logo
// Features:
// 1. Solid electric purple canvas (#5814ea)
// 2. Bold white stylized Monogram B with forward dynamic tilt (~8 deg)
// 3. Slanted parallelogram inner counter inside top loop
// 4. Two elegant swooshing book pages/leaves fanning out to bottom-right
// 5. Inward-curving open spine at bottom-left
const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#5814ea" />
  
  <g fill="#ffffff">
    <!-- Main B structure: Spine + Top loop + Outer contour -->
    <path fill-rule="evenodd" d="
      M 194,56
      C 236,56 298,72 336,108
      C 370,140 376,188 350,230
      C 334,256 308,272 276,282
      L 276,282
      C 332,296 370,332 374,380
      C 376,400 366,418 344,432
      C 305,456 232,464 165,456
      C 138,452 122,434 122,408
      C 122,380 126,200 132,130
      C 136,82 160,56 194,56
      Z

      M 186,118
      C 214,116 238,124 250,138
      C 264,154 262,176 248,194
      C 234,210 208,222 182,228
      L 174,228
      L 186,118
      Z
    " />

    <!-- Negative space cutouts to form the two distinct fanning book pages -->
    <!-- Cutout 1: Separates upper body and middle page -->
    <path d="
      M 160,336
      C 192,328 240,305 292,274
      C 318,258 338,244 350,230
      C 356,236 358,246 350,258
      C 328,290 286,324 232,352
      C 190,374 150,388 132,384
      Z
    " fill="#5814ea" />

    <!-- Cutout 2: Separates middle page and bottom page -->
    <path d="
      M 134,424
      C 152,410 188,396 236,378
      C 292,356 345,318 376,276
      C 382,285 380,296 368,312
      C 330,360 268,406 200,428
      C 168,438 144,436 134,424
      Z
    " fill="#5814ea" />
  </g>
</svg>`;

async function generateAllIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const svgBuffer = Buffer.from(svgLogo);

  // 1. logo.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'logo.png'));
  console.log('✓ Generated public/logo.png');

  // 2. icon-512.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ Generated public/icon-512.png');

  // 3. icon-maskable-512.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('✓ Generated public/icon-maskable-512.png');

  // 4. icon-192.png (192x192)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ Generated public/icon-192.png');

  // 5. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Generated public/apple-touch-icon.png');

  // 6. favicon-32x32.png (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ Generated public/favicon-32x32.png');

  // 7. favicon-16x16.png (16x16)
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('✓ Generated public/favicon-16x16.png');

  // 8. favicon.png (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Generated public/favicon.png');
}

generateAllIcons()
  .then(() => console.log('All raster icon assets successfully created!'))
  .catch(err => {
    console.error('Error generating raster icons:', err);
    process.exit(1);
  });
