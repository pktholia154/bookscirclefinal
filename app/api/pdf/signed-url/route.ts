import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const FIREBASE_STORAGE_BUCKET = 'bookscircle-d579d.firebasestorage.app';
const SIGNING_SECRET = process.env.SIGNED_URL_SECRET || process.env.RAZORPAY_KEY_SECRET || 'bookscircle_secure_pdf_signing_secret_2026';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookId, pdfStoragePath, userId, userEmail } = body;

    if (!bookId) {
      return NextResponse.json(
        { error: 'Missing required parameter: bookId' },
        { status: 400 }
      );
    }

    // Resolve clean protected storage path
    let resolvedStoragePath = pdfStoragePath || `protected/full_books/${bookId}.pdf`;
    resolvedStoragePath = resolvedStoragePath.replace(/^\/+/, '');

    // Ensure it references the protected storage tier
    if (!resolvedStoragePath.startsWith('protected/')) {
      resolvedStoragePath = `protected/full_books/${resolvedStoragePath.split('/').pop() || `${bookId}.pdf`}`;
    }

    // Generate secure lifetime signed token for this book & user session
    const timestamp = Date.now();
    // Lifetime token valid for long-term study access
    const signaturePayload = `${bookId}|${resolvedStoragePath}|${userId || 'verified_buyer'}|${timestamp}`;
    const token = crypto
      .createHmac('sha256', SIGNING_SECRET)
      .update(signaturePayload)
      .digest('hex');

    // Build the direct Firebase Storage media URL for the protected asset
    const directStorageUrl = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(
      resolvedStoragePath
    )}?alt=media`;

    // Secure proxy URL incorporating crawler-proof headers & signature token
    const secureProxyUrl = `/api/pdf?url=${encodeURIComponent(directStorageUrl)}&token=${token}&bookId=${encodeURIComponent(
      bookId
    )}`;

    return NextResponse.json({
      success: true,
      bookId,
      pdfStoragePath: resolvedStoragePath,
      url: directStorageUrl,
      secureProxyUrl,
      signedToken: token,
      isLifetime: true,
      expiresAt: 'never',
      storageBucket: FIREBASE_STORAGE_BUCKET,
    });
  } catch (error: any) {
    console.error('Error generating signed PDF URL:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate secure signed URL for PDF' },
      { status: 500 }
    );
  }
}
