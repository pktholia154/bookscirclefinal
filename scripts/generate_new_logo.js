const fs = require('fs');
const { execSync } = require('child_process');

// Precise reproduction of booksCircle (2).png
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Solid Royal Purple Canvas with smooth squircle border -->
  <rect width="512" height="512" rx="96" fill="#5A15EC" />
  
  <g fill="#FFFFFF">
    <!-- Top & Main Upper Body of Stylized "B" -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="
      M 160 145
      C 152 155, 142 175, 142 205
      L 142 375
      C 142 395, 148 412, 162 422
      C 172 428, 185 422, 198 412
      C 230 385, 290 350, 362 312
      C 375 305, 380 292, 380 276
      C 380 236, 352 216, 328 206
      C 356 192, 370 166, 368 138
      C 362 92, 318 72, 265 80
      L 182 92
      C 168 95, 162 108, 160 120
      L 160 145
      Z
      
      M 218 152
      L 265 142
      C 288 136, 306 148, 306 170
      C 306 190, 288 204, 260 210
      L 218 218
      Z
      
      M 218 258
      L 270 248
      C 298 242, 318 254, 318 278
      C 318 300, 294 316, 262 322
      L 218 330
      Z
    " />
    
    <!-- Middle Curved Page Swoosh -->
    <path d="
      M 152 396
      C 162 392, 215 372, 285 348
      C 340 330, 375 315, 382 305
      C 378 322, 342 355, 280 390
      C 220 424, 168 436, 146 432
      C 140 430, 138 422, 142 414
      C 144 406, 148 400, 152 396
      Z
    " />

    <!-- Bottom Curved Page Swoosh -->
    <path d="
      M 158 434
      C 180 430, 235 412, 302 386
      C 355 365, 388 346, 392 338
      C 386 355, 345 392, 280 426
      C 222 458, 172 464, 154 458
      C 148 456, 146 448, 150 442
      C 152 438, 154 436, 158 434
      Z
    " />
  </g>
</svg>`;

fs.writeFileSync('public/logo.svg', svg);
execSync('ffmpeg -y -i public/logo.svg -vf scale=512:512 public/logo.png 2>/dev/null');
execSync('ffmpeg -y -i public/logo.svg -vf scale=512:512 public/icon-512.png 2>/dev/null');
execSync('ffmpeg -y -i public/logo.svg -vf scale=512:512 public/icon-maskable-512.png 2>/dev/null');
execSync('ffmpeg -y -i public/logo.svg -vf scale=192:192 public/icon-192.png 2>/dev/null');
execSync('ffmpeg -y -i public/logo.svg -vf scale=180:180 public/apple-touch-icon.png 2>/dev/null');
execSync('ffmpeg -y -i public/logo.svg -vf scale=48:48 public/favicon.png 2>/dev/null');
execSync('ffmpeg -y -i public/logo.svg -vf scale=32:32 public/favicon-32x32.png 2>/dev/null');
execSync('ffmpeg -y -i public/logo.svg -vf scale=16:16 public/favicon-16x16.png 2>/dev/null');
console.log('Generated all raster PNG icons successfully');
