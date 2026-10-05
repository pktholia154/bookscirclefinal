const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const opentype = require('opentype.js');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const fontPath = '/tmp/Anton.ttf';

if (!fs.existsSync(fontPath)) {
  console.error('Font not found at', fontPath);
  process.exit(1);
}

const fontBuffer = fs.readFileSync(fontPath);
const font = opentype.parse(fontBuffer.buffer);

// 512x512 Canvas layout calculations
const canvasSize = 512;
const centerX = canvasSize / 2; // 256

// 'books' text: pure white (#FFFFFF), Anton font, heavy & punchy
const fontSizeBooks = 126;
const rawPathBooks = font.getPath('books', 0, 0, fontSizeBooks);
const bboxBooks = rawPathBooks.getBoundingBox();
const booksWidth = bboxBooks.x2 - bboxBooks.x1;
const booksX = centerX - (bboxBooks.x1 + booksWidth / 2);
const booksY = 206;
const booksPathData = font.getPath('books', booksX, booksY, fontSizeBooks).toPathData(2);

// 'circle' text: vivid neon lime (#CCFF00), Anton font
const fontSizeCircle = 135;
const rawPathCircle = font.getPath('circle', 0, 0, fontSizeCircle);
const bboxCircle = rawPathCircle.getBoundingBox();
const circleWidth = bboxCircle.x2 - bboxCircle.x1;
const circleX = centerX - (bboxCircle.x1 + circleWidth / 2);
const circleY = 334;
const circlePathData = font.getPath('circle', circleX, circleY, fontSizeCircle).toPathData(2);

// Smile Arc: swooshes under 'circle', starting from x=54 under the first letter, dipping to y=436, and swooping up to x=422, y=392
const smileArcPath = "M 54 374 C 115 428 235 448 422 392";

// Dynamic Arrowhead at the right end pointing up-right:
// Tip at (456, 368), top barb curves back to (388, 348), bottom barb curves back to (422, 426)
const arrowheadPath = "M 388 348 C 404 352 438 358 456 368 C 446 384 434 406 422 426";

// Primary brand background: Electric Violet / Purple (#5E14EE)
const bgColor = "#5E14EE";
const limeColor = "#CCFF00";
const whiteColor = "#FFFFFF";

// Build standalone pure vector SVG (zero external dependencies, zero font downloads required)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${bgColor}"/>
  <!-- 'books' in bold white -->
  <path d="${booksPathData}" fill="${whiteColor}"/>
  <!-- 'circle' in vivid neon lime -->
  <path d="${circlePathData}" fill="${limeColor}"/>
  <!-- Smile arc -->
  <path d="${smileArcPath}" fill="none" stroke="${whiteColor}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Dynamic Arrowhead -->
  <path d="${arrowheadPath}" fill="none" stroke="${whiteColor}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const svgPath = path.join(publicDir, 'logo.svg');
fs.writeFileSync(svgPath, svgContent.trim() + '\n', 'utf8');
console.log('Generated:', svgPath);

// Generate Master 512x512 PNG using ImageMagick with exact Anton font and vector paths
const masterPng = path.join(publicDir, 'logo.png');
const imCmd = `convert -size 512x512 xc:"${bgColor}" \\
  -font ${fontPath} -pointsize 126 -fill "${whiteColor}" -gravity north -annotate +0+104 "books" \\
  -font ${fontPath} -pointsize 135 -fill "${limeColor}" -gravity north -annotate +0+222 "circle" \\
  -stroke "${whiteColor}" -strokewidth 19 -fill none \\
  -draw "stroke-linecap round stroke-linejoin round path '${smileArcPath}'" \\
  -draw "stroke-linecap round stroke-linejoin round stroke-width 17 path '${arrowheadPath}'" \\
  ${masterPng}`;

execSync(imCmd, { stdio: 'inherit' });
console.log('Generated master PNG:', masterPng);

// Generate all responsive PNG derivatives from master PNG
const targets = [
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-192.png', size: 192 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon.png', size: 48 },
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'favicon-16x16.png', size: 16 }
];

targets.forEach(t => {
  const dest = path.join(publicDir, t.file);
  execSync(`convert "${masterPng}" -resize ${t.size}x${t.size} "${dest}"`, { stdio: 'inherit' });
  console.log(`Generated: ${dest} (${t.size}x${t.size})`);
});

// Generate maskable icon (safe area 80% scale centered on #5E14EE background)
const maskablePng = path.join(publicDir, 'icon-maskable-512.png');
const maskableCmd = `convert -size 512x512 xc:"${bgColor}" \\
  \\( "${masterPng}" -resize 410x410 \\) -gravity center -composite \\
  "${maskablePng}"`;
execSync(maskableCmd, { stdio: 'inherit' });
console.log('Generated maskable icon:', maskablePng);

console.log('All brand logo assets successfully generated!');
