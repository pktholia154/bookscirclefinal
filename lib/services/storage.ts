import { DEFAULT_BOOK_COVER } from '../data';

export const FIREBASE_STORAGE_BUCKET = 'bookscircle-d579d.firebasestorage.app';
export const FIREBASE_STORAGE_BASE_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o`;

/**
 * Normalizes any Firebase storage path (gs://, relative path, or existing HTTPS URL)
 * into a clean, direct Firebase Storage media URL for instant direct access.
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
        if (!trimmed.includes('alt=media')) {
          const joinChar = trimmed.includes('?') ? '&' : '?';
          return `${trimmed}${joinChar}alt=media`;
        }
      }
    }
    return trimmed;
  }

  // Handle gs:// URLs (e.g. gs://bookscircle-d579d.firebasestorage.app/public/samples/demo.pdf)
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

  // Relative storage path (e.g. "public/samples/demo.pdf" or "full_books/demo.pdf" or "books/demo.pdf")
  const cleanPath = decodeURIComponent(trimmed.replace(/^\/+/, ''));
  return `${FIREBASE_STORAGE_BASE_URL}/${encodeURIComponent(cleanPath)}?alt=media`;
}

/**
 * Resolves the public cover image URL for all visitors
 */
export function resolveBookCoverUrl(coverOrImageUrl?: string | null, bookId?: string): string {
  if (coverOrImageUrl && coverOrImageUrl.trim()) {
    const trimmed = coverOrImageUrl.trim();
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      return trimmed;
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
    const trimmed = sampleUrlOrPath.trim();
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      return trimmed;
    }
    return formatFirebaseStorageUrl(trimmed);
  }
  if (bookId) {
    return formatFirebaseStorageUrl(`public/samples/${bookId}.pdf`);
  }
  return '';
}

/**
 * Resolves the direct, full PDF file URL for purchased books directly from Firebase Storage
 */
export function resolveBookPdfUrl(pdfUrlOrPath?: string | null, bookId?: string): string {
  if (pdfUrlOrPath && pdfUrlOrPath.trim()) {
    const trimmed = pdfUrlOrPath.trim();
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      return trimmed;
    }
    return formatFirebaseStorageUrl(trimmed);
  }
  if (bookId) {
    return formatFirebaseStorageUrl(`public/samples/${bookId}.pdf`);
  }
  return '';
}

/**
 * Resolves normalized storage path for books
 */
export function resolveFullBookStoragePath(pdfStoragePathOrUrl?: string | null, bookId?: string): string {
  if (pdfStoragePathOrUrl && pdfStoragePathOrUrl.trim()) {
    return formatFirebaseStorageUrl(pdfStoragePathOrUrl);
  }
  if (bookId) {
    return formatFirebaseStorageUrl(`public/samples/${bookId}.pdf`);
  }
  return '';
}

/**
 * Direct PDF URL Resolver (replaces previous signed URL requirement with direct media access)
 */
export async function getVerifiedFullPdfSignedUrl(params: {
  bookId: string;
  pdfStoragePath?: string;
  userId?: string;
  userEmail?: string;
}): Promise<{ url: string; signedToken?: string; isLifetime?: boolean; expiresAt?: string; secureProxyUrl?: string }> {
  const directUrl = resolveBookPdfUrl(params.pdfStoragePath, params.bookId);
  return {
    url: directUrl,
    signedToken: 'direct_access',
    isLifetime: true,
    secureProxyUrl: directUrl,
  };
}

