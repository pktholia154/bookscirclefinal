import { DEFAULT_BOOK_COVER } from '../data';

export const FIREBASE_STORAGE_BUCKET = 'bookscircle-d579d.firebasestorage.app';
export const FIREBASE_STORAGE_BASE_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o`;

/**
 * Normalizes any Firebase storage path (gs://, relative path, or existing HTTPS URL)
 * into a clean, direct Firebase Storage media URL.
 * 
 * Storage Organisation:
 * - Public Covers:  gs://bookscircle-d579d.firebasestorage.app > public > covers
 * - Public Samples: gs://bookscircle-d579d.firebasestorage.app > public > samples
 * - Protected Full: gs://bookscircle-d579d.firebasestorage.app > protected > full_books
 */
export function formatFirebaseStorageUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';

  // Already a full HTTPS/HTTP URL
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    if (trimmed.includes('firebasestorage.googleapis.com')) {
      try {
        const urlObj = new URL(trimmed);
        const pathname = urlObj.pathname;
        const oIndex = pathname.indexOf('/o/');
        if (oIndex !== -1) {
          const rawObjectPath = decodeURIComponent(pathname.substring(oIndex + 3));
          const encodedObjectPath = encodeURIComponent(rawObjectPath);
          const base = `${urlObj.origin}${pathname.substring(0, oIndex + 3)}`;
          
          if (!urlObj.searchParams.has('alt')) {
            urlObj.searchParams.set('alt', 'media');
          }
          return `${base}${encodedObjectPath}?${urlObj.searchParams.toString()}`;
        }
      } catch {
        // Fallback to basic string parsing if URL constructor fails
        if (!trimmed.includes('alt=media')) {
          const joinChar = trimmed.includes('?') ? '&' : '?';
          return `${trimmed}${joinChar}alt=media`;
        }
      }
    }
    return trimmed;
  }

  // Handle gs:// URLs (e.g. gs://bookscircle-d579d.firebasestorage.app/public/samples/demo-5ca84c.pdf)
  if (trimmed.startsWith('gs://')) {
    const withoutGs = trimmed.replace(/^gs:\/\//, '');
    const slashIdx = withoutGs.indexOf('/');
    if (slashIdx !== -1) {
      const bucket = withoutGs.substring(0, slashIdx);
      const relativePath = decodeURIComponent(withoutGs.substring(slashIdx + 1));
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(relativePath)}?alt=media`;
    }
    return `${FIREBASE_STORAGE_BASE_URL}/${encodeURIComponent(decodeURIComponent(withoutGs))}?alt=media`;
  }

  // Relative storage path (e.g. "public/samples/demo-5ca84c.pdf" or "protected/full_books/demo-5ca84c.pdf")
  const cleanPath = decodeURIComponent(trimmed.replace(/^\/+/, ''));
  return `${FIREBASE_STORAGE_BASE_URL}/${encodeURIComponent(cleanPath)}?alt=media`;
}

/**
 * Resolves the public cover image URL for all visitors
 */
export function resolveBookCoverUrl(coverOrImageUrl?: string | null, bookId?: string): string {
  if (coverOrImageUrl && coverOrImageUrl.trim()) {
    const trimmed = coverOrImageUrl.trim();
    // If referencing legacy /books/<id>/images path with expired token (causing 403), reroute to public/covers
    if (trimmed.includes('books%2F') || trimmed.includes('/books/')) {
      if (bookId) {
        return formatFirebaseStorageUrl(`public/covers/${bookId}.png`);
      }
    }
    return formatFirebaseStorageUrl(trimmed);
  }
  if (bookId) {
    return formatFirebaseStorageUrl(`public/covers/${bookId}.png`);
  }
  return DEFAULT_BOOK_COVER;
}

/**
 * Resolves the public sample PDF URL accessible by all visitors
 */
export function resolveBookSampleUrl(sampleUrlOrPath?: string | null, bookId?: string): string {
  if (sampleUrlOrPath && sampleUrlOrPath.trim()) {
    return formatFirebaseStorageUrl(sampleUrlOrPath);
  }
  if (bookId) {
    return formatFirebaseStorageUrl(`public/samples/${bookId}.pdf`);
  }
  return '';
}

/**
 * Resolves the normalized protected storage path for full books
 */
export function resolveFullBookStoragePath(pdfStoragePathOrUrl?: string | null, bookId?: string): string {
  if (pdfStoragePathOrUrl && pdfStoragePathOrUrl.trim()) {
    const trimmed = pdfStoragePathOrUrl.trim();
    // If it's a gs:// path, extract the relative path
    if (trimmed.startsWith('gs://')) {
      const parts = trimmed.replace(/^gs:\/\//, '').split('/');
      parts.shift(); // remove bucket
      return parts.join('/');
    }
    // If it's a full firebasestorage url, extract the object path
    if (trimmed.includes('/o/')) {
      const rawObject = trimmed.split('/o/')[1]?.split('?')[0];
      if (rawObject) return decodeURIComponent(rawObject);
    }
    return trimmed.replace(/^\/+/, '');
  }
  if (bookId) {
    return `protected/full_books/${bookId}.pdf`;
  }
  return '';
}

/**
 * Requests a secure Signed URL for a verified purchased full PDF
 */
export async function getVerifiedFullPdfSignedUrl(params: {
  bookId: string;
  pdfStoragePath?: string;
  userId?: string;
  userEmail?: string;
}): Promise<{ url: string; signedToken?: string; isLifetime?: boolean; expiresAt?: string; secureProxyUrl?: string }> {
  const response = await fetch('/api/pdf/signed-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error || `Failed to verify purchase (HTTP ${response.status})`);
  }

  const data = await response.json();
  return data;
}
