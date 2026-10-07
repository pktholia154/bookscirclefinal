import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const publicDir = path.join(process.cwd(), 'public');

    // 1. Save exact original byte-for-byte uploaded file
    fs.writeFileSync(path.join(publicDir, 'logo.png'), buffer);
    fs.writeFileSync(path.join(publicDir, 'booksCircle (2).png'), buffer);

    // 2. Generate derivative icons for PWA & favicon
    try {
      await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
      await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));
      await sharp(buffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
      await sharp(buffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
      await sharp(buffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
      await sharp(buffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
      await sharp(buffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'));
    } catch (e) {
      console.warn('Icon derivation note:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Exact logo file uploaded and applied successfully!',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Upload logo error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to upload logo' }, { status: 500 });
  }
}
