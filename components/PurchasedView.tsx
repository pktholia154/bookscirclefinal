'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  BookOpen,
  Check,
  Trash2,
  RefreshCw,
  ShoppingBag,
  WifiOff,
  Wifi,
  Play,
} from 'lucide-react';
import { Book } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import {
  savePdfOffline,
  deleteOfflinePdf,
  getAllOfflineBookIds,
  getAllOfflineBooks,
  getOfflineStorageStats,
  requestPersistentStorage,
  saveEpubOffline,
  deleteOfflineEpub,
  getAllOfflineEpubIds,
  ReadingProgressRecord,
  getAllReadingProgress,
} from '@/lib/offline-storage';
import { resolveBookPdfUrl, resolveBookSampleUrl, resolveBookMdUrl } from '@/lib/services/storage';
import { PDFReaderModal } from '@/components/PDFReaderModal';
import { MarkdownReaderModal } from '@/components/MarkdownReaderModal';
import { UserProfile } from '@/components/Header';

interface PurchasedViewProps {
  books: Book[];
  purchasedBookIds: string[];
  currentUser?: UserProfile | null;
  onSelectBook: (book: Book) => void;
  onNavigateHome: () => void;
  onSyncPurchases?: () => Promise<void>;
}

interface DownloadState {
  status: 'idle' | 'downloading' | 'downloaded' | 'error';
  progress: number;
  loadedMb: number;
  totalMb: number;
  errorMsg?: string;
}

export const PurchasedView: React.FC<PurchasedViewProps> = ({
  books,
  purchasedBookIds,
  currentUser,
  onSelectBook,
  onNavigateHome,
}) => {
  const [offlinePdfMap, setOfflinePdfMap] = useState<Record<string, DownloadState>>({});
  const [offlineEpubMap, setOfflineEpubMap] = useState<Record<string, DownloadState>>({});
  const [offlineCachedBooks, setOfflineCachedBooks] = useState<Book[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'offline_only'>('all');
  const [readingProgressMap, setReadingProgressMap] = useState<Record<string, ReadingProgressRecord>>({});
  const [activeReader, setActiveReader] = useState<{
    book: Book;
    mode: 'full' | 'offline';
    initialPage?: number;
  } | null>(null);
  const [activeMdReader, setActiveMdReader] = useState<{
    book: Book;
    initialSectionIndex?: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<{ count: number; totalBytes: number; isPersisted: boolean }>({
    count: 0,
    totalBytes: 0,
    isPersisted: false,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync offline status from IndexedDB for both PDFs and ePubs
  const refreshOfflineStatus = useCallback(async () => {
    try {
      const [offlinePdfIds, offlineEpubIds, cached, stats] = await Promise.all([
        getAllOfflineBookIds(),
        getAllOfflineEpubIds(),
        getAllOfflineBooks(),
        getOfflineStorageStats(),
      ]);

      const newPdfMap: Record<string, DownloadState> = {};
      offlinePdfIds.forEach((id) => {
        newPdfMap[id] = {
          status: 'downloaded',
          progress: 100,
          loadedMb: 0,
          totalMb: 0,
        };
      });
      setOfflinePdfMap((prev) => ({ ...prev, ...newPdfMap }));

      const newEpubMap: Record<string, DownloadState> = {};
      offlineEpubIds.forEach((id) => {
        newEpubMap[id] = {
          status: 'downloaded',
          progress: 100,
          loadedMb: 0,
          totalMb: 0,
        };
      });
      setOfflineEpubMap((prev) => ({ ...prev, ...newEpubMap }));

      if (cached && cached.length > 0) {
        setOfflineCachedBooks(cached);
      }
      setStorageStats(stats);
    } catch (e) {
      console.warn('Failed to load offline keys:', e);
    }
  }, []);

  // Hydrate reading progress from IndexedDB and listen to reactive events
  useEffect(() => {
    let active = true;
    getAllReadingProgress().then((records) => {
      if (active && records) {
        setReadingProgressMap(records);
      }
    });

    const handleProgressUpdate = (e: Event) => {
      const detail = (e as CustomEvent<ReadingProgressRecord>).detail;
      if (detail && detail.bookId) {
        setReadingProgressMap((prev) => ({
          ...prev,
          [detail.bookId]: detail,
        }));
      }
    };

    window.addEventListener('reading-progress-updated', handleProgressUpdate);
    return () => {
      active = false;
      window.removeEventListener('reading-progress-updated', handleProgressUpdate);
    };
  }, []);

  const handleResumeBook = (book: Book, progress: ReadingProgressRecord) => {
    if (progress.format === 'pdf') {
      const isPdfDownloaded = offlinePdfMap[book.id]?.status === 'downloaded';
      const targetMode = progress.mode === 'offline' && isPdfDownloaded ? 'offline' : 'full';
      setActiveReader({ book, mode: targetMode, initialPage: progress.page });
    } else {
      setActiveMdReader({ book, initialSectionIndex: progress.sectionIndex });
    }
  };

  // Initialize offline status on mount
  useEffect(() => {
    refreshOfflineStatus();

    requestPersistentStorage()
      .then((granted) => {
        if (granted) {
          setStorageStats((prev) => ({ ...prev, isPersisted: true }));
        }
      })
      .catch(() => {});
  }, [refreshOfflineStatus]);

  // Map of all known books (remote Firestore + local offline metadata)
  const allKnownBooksMap = useMemo(() => {
    const map = new Map<string, Book>();
    offlineCachedBooks.forEach((b) => map.set(b.id, b));
    books.forEach((b) => map.set(b.id, b));
    return map;
  }, [books, offlineCachedBooks]);

  // Purchased books list (including offline cached items)
  const purchasedBooks = useMemo(() => {
    const offlineIds = [
      ...Object.keys(offlinePdfMap).filter((id) => offlinePdfMap[id]?.status === 'downloaded'),
      ...Object.keys(offlineEpubMap).filter((id) => offlineEpubMap[id]?.status === 'downloaded'),
    ];
    const combinedIds = Array.from(new Set([...purchasedBookIds, ...offlineIds]));
    return combinedIds
      .map((id) => allKnownBooksMap.get(id))
      .filter((b): b is Book => Boolean(b));
  }, [purchasedBookIds, offlinePdfMap, offlineEpubMap, allKnownBooksMap]);

  // Filtered by offline mode filter
  const filteredPurchasedBooks = purchasedBooks.filter((book) => {
    const isDownloaded =
      offlinePdfMap[book.id]?.status === 'downloaded' ||
      offlineEpubMap[book.id]?.status === 'downloaded';
    return filterMode === 'all' || (filterMode === 'offline_only' && isDownloaded);
  });

  // Handle Download PDF to device IndexedDB
  const handleDownloadPdfOffline = async (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const targetUrl =
      resolveBookPdfUrl(book.pdf_file || book.pdfUrl || book.pdfStoragePath, book.id) ||
      resolveBookSampleUrl(book.sample_file || book.sampleUrl, book.id);
    if (!targetUrl) {
      showToast('No PDF source URL available for this book.');
      return;
    }

    setOfflinePdfMap((prev) => ({
      ...prev,
      [book.id]: {
        status: 'downloading',
        progress: 10,
        loadedMb: 0.5,
        totalMb: parseFloat(book.file_size || '12.5'),
      },
    }));

    try {
      let response: Response;
      try {
        response = await fetch(targetUrl, { mode: 'cors' });
        if (!response.ok) throw new Error('Direct fetch failed');
      } catch {
        const proxyUrl = `/api/pdf?url=${encodeURIComponent(targetUrl)}`;
        response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy fetch error ${response.status}`);
      }

      const contentLength = +(response.headers.get('content-length') || '0');
      const estimatedTotal = contentLength || 8 * 1024 * 1024;
      const totalMbNum = +(estimatedTotal / (1024 * 1024)).toFixed(1);

      if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let receivedLength = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedLength += value.length;
            const pct = Math.min(
              Math.max(Math.round((receivedLength / estimatedTotal) * 100), 15),
              95
            );
            const loadedMbNum = +(receivedLength / (1024 * 1024)).toFixed(1);

            setOfflinePdfMap((prev) => ({
              ...prev,
              [book.id]: {
                status: 'downloading',
                progress: pct,
                loadedMb: loadedMbNum,
                totalMb: totalMbNum,
              },
            }));
          }
        }

        const allChunks = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          allChunks.set(chunk, position);
          position += chunk.length;
        }

        await savePdfOffline(book.id, allChunks.buffer, book);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        await savePdfOffline(book.id, arrayBuffer, book);
      }

      setOfflinePdfMap((prev) => ({
        ...prev,
        [book.id]: {
          status: 'downloaded',
          progress: 100,
          loadedMb: totalMbNum,
          totalMb: totalMbNum,
        },
      }));

      await refreshOfflineStatus();
      showToast(`"${book.title.slice(0, 22)}..." PDF saved offline!`);
    } catch (err: any) {
      console.error('Download offline PDF error:', err);
      setOfflinePdfMap((prev) => ({
        ...prev,
        [book.id]: {
          status: 'error',
          progress: 0,
          loadedMb: 0,
          totalMb: 0,
          errorMsg: err?.message || 'Download failed',
        },
      }));
      showToast('Could not save PDF offline. Check network.');
    }
  };

  // Delete downloaded offline PDF
  const handleDeletePdfOffline = async (bookId: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteOfflinePdf(bookId);
      setOfflinePdfMap((prev) => {
        const copy = { ...prev };
        delete copy[bookId];
        return copy;
      });
      await refreshOfflineStatus();
      showToast(`Removed offline PDF of "${title.slice(0, 20)}..."`);
    } catch {
      showToast('Failed to remove offline copy.');
    }
  };

  // Handle Download ePub (Markdown) to device IndexedDB
  const handleDownloadEpubOffline = async (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setOfflineEpubMap((prev) => ({
      ...prev,
      [book.id]: {
        status: 'downloading',
        progress: 25,
        loadedMb: 0.1,
        totalMb: 0.2,
      },
    }));

    try {
      const targetUrl = resolveBookMdUrl(book.mdurl || book.mdUrl || book.md_url || book.md_file, book.id);
      let mdText = '';

      if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
        try {
          const res = await fetch(targetUrl, { mode: 'cors' });
          if (res.ok) {
            const text = await res.text();
            if (text && text.trim().length > 0) mdText = text;
          }
        } catch {}
      }

      if (!mdText) {
        const proxyUrl = `/api/md?url=${encodeURIComponent(targetUrl || '')}&bookId=${encodeURIComponent(book.id || '')}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 0) mdText = text;
        }
      }

      if (!mdText) throw new Error('Could not download ePub content.');

      await saveEpubOffline(book.id, mdText, book);

      setOfflineEpubMap((prev) => ({
        ...prev,
        [book.id]: {
          status: 'downloaded',
          progress: 100,
          loadedMb: 0.2,
          totalMb: 0.2,
        },
      }));

      await refreshOfflineStatus();
      showToast(`"${book.title.slice(0, 22)}..." ePub saved offline!`);
    } catch (err: any) {
      console.error('Download ePub error:', err);
      setOfflineEpubMap((prev) => ({
        ...prev,
        [book.id]: {
          status: 'error',
          progress: 0,
          loadedMb: 0,
          totalMb: 0,
          errorMsg: err?.message || 'Download failed',
        },
      }));
      showToast('Could not save ePub offline. Check network.');
    }
  };

  // Delete downloaded offline ePub
  const handleDeleteEpubOffline = async (bookId: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteOfflineEpub(bookId);
      setOfflineEpubMap((prev) => {
        const copy = { ...prev };
        delete copy[bookId];
        return copy;
      });
      await refreshOfflineStatus();
      showToast(`Removed offline ePub of "${title.slice(0, 20)}..."`);
    } catch {
      showToast('Failed to remove offline ePub copy.');
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 py-3 sm:py-5 max-w-4xl mx-auto space-y-4">
      {/* 1. Header (Auto-synced from Firebase DB) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-950">Purchased Library</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1c0ca3] text-white">
              {purchasedBooks.length} {purchasedBooks.length === 1 ? 'Book' : 'Books'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Auto-synced across your devices &amp; study platforms with offline access for both PDF and ePub.
          </p>
        </div>
      </div>

      {/* 2. Active Library & Offline Controls */}
      <div className="space-y-3.5">
        {/* Quick Filter & Storage Info Bar */}
        {purchasedBooks.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-[#1c0ca3] text-white shadow-2xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                All Purchased ({purchasedBooks.length})
              </button>
              <button
                onClick={() => setFilterMode('offline_only')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterMode === 'offline_only'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <WifiOff className="w-3 h-3" />
                <span>Downloaded ({storageStats.count})</span>
              </button>
            </div>

            {/* Storage Info */}
            <div className="flex items-center gap-2 text-xs">
              {storageStats.count > 0 && (
                <span className="text-[11px] font-medium text-gray-500 hidden sm:inline">
                  {(storageStats.totalBytes / (1024 * 1024)).toFixed(1)} MB stored
                </span>
              )}
              {storageStats.isPersisted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span>Offline Storage Protected</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {purchasedBooks.length === 0 ? (
          <div className="py-16 text-center bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4 p-6">
            <div className="w-16 h-16 rounded-full bg-purple-100/60 text-[#1c0ca3] flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">Your Library is Empty</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Browse our catalog of study guides and competitive exam preparation e-books. All purchases auto-sync across your devices with offline access for both PDF and ePub.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                id="empty-library-browse-btn"
                onClick={onNavigateHome}
                className="px-5 py-2.5 bg-[#1c0ca3] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#150980] cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Explore E-Books</span>
              </button>
            </div>
          </div>
        ) : (
          /* Books Grid: Strictly 1 item per row on mobile & tablet so delete button & buttons remain 100% visible */
          <div className="grid grid-cols-1 gap-3.5">
            {filteredPurchasedBooks.map((book) => {
              const pdfDlState = offlinePdfMap[book.id] || { status: 'idle', progress: 0, loadedMb: 0, totalMb: 0 };
              const isPdfDownloaded = pdfDlState.status === 'downloaded';
              const isPdfDownloading = pdfDlState.status === 'downloading';

              const epubDlState = offlineEpubMap[book.id] || { status: 'idle', progress: 0, loadedMb: 0, totalMb: 0 };
              const isEpubDownloaded = epubDlState.status === 'downloaded';
              const isEpubDownloading = epubDlState.status === 'downloading';

              return (
                <div
                  key={book.id}
                  className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200/90 bg-white hover:border-[#1c0ca3]/40 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                >
                  {/* Top Info Section */}
                  <div
                    className="flex gap-3 sm:gap-4 cursor-pointer"
                    onClick={() => onSelectBook(book)}
                  >
                    {/* Cover */}
                    <div className="relative w-16 sm:w-20 aspect-[3/4] shrink-0 overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs rounded-lg">
                      <Image
                        src={book.cover || DEFAULT_BOOK_COVER}
                        alt={book.title}
                        fill
                        unoptimized
                        sizes="80px"
                        className="object-cover group-hover:scale-103 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black text-[#1c0ca3] uppercase tracking-wider bg-[#1c0ca3]/10 px-1.5 py-0.5 rounded">
                            {book.category || 'EXAM'}
                          </span>
                          {(isPdfDownloaded || isEpubDownloaded) && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              <span>
                                {isPdfDownloaded && isEpubDownloaded
                                  ? 'Offline Ready (PDF + ePub)'
                                  : isPdfDownloaded
                                  ? 'PDF Offline'
                                  : 'ePub Offline'}
                              </span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-gray-950 mt-1 line-clamp-2 leading-snug group-hover:text-[#1c0ca3] transition-colors">
                          {book.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-2">
                        <span>{book.pages || 280} Pages</span>
                        <span>•</span>
                        <span>{book.language || 'English'}</span>
                        <span>•</span>
                        <span>{book.file_size || '14.5 MB'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Minimal Reading Progress & Resume Option */}
                  {readingProgressMap[book.id] && readingProgressMap[book.id].progressPercentage > 0 && (
                    <div className="pt-2 pb-0.5 border-t border-gray-100 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0 text-gray-600">
                          <span className="font-black text-[#5e17eb] shrink-0">
                            {readingProgressMap[book.id].progressPercentage}% read
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-500 text-[10px] truncate">
                            {readingProgressMap[book.id].format === 'pdf' && readingProgressMap[book.id].page
                              ? `Page ${readingProgressMap[book.id].page}${
                                  readingProgressMap[book.id].totalPdfPages
                                    ? ` of ${readingProgressMap[book.id].totalPdfPages}`
                                    : ''
                                }`
                              : readingProgressMap[book.id].sectionIndex !== undefined
                              ? `Chapter ${(readingProgressMap[book.id].sectionIndex || 0) + 1}${
                                  readingProgressMap[book.id].totalSections
                                    ? ` of ${readingProgressMap[book.id].totalSections}`
                                    : ''
                                }`
                              : `${readingProgressMap[book.id].progressPercentage}% completed`}
                          </span>
                        </div>
                        <button
                          id={`btn-resume-purchased-${book.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResumeBook(book, readingProgressMap[book.id]);
                          }}
                          className="text-[11px] font-bold text-[#5e17eb] hover:text-[#4d0ec5] active:scale-95 inline-flex items-center gap-1 transition-all cursor-pointer py-0.5 px-2 rounded-md hover:bg-[#5e17eb]/10 shrink-0"
                          title="Resume reading where you left off"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Resume</span>
                        </button>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={readingProgressMap[book.id].progressPercentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Reading progress: ${readingProgressMap[book.id].progressPercentage}%`}
                        className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/60"
                      >
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(2, readingProgressMap[book.id].progressPercentage))}%`,
                          }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            readingProgressMap[book.id].progressPercentage >= 100
                              ? 'bg-emerald-500'
                              : 'bg-[#5e17eb]'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions Section: buttons stay in the same row on mobile & tablet */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    {/* Row 1: PDF */}
                    <div className="flex items-center gap-1.5 sm:gap-3 flex-nowrap min-w-0">
                      <span className="w-8 sm:w-10 shrink-0 text-xs sm:text-sm font-black text-[#1c0ca3] tracking-tight">
                        PDF
                      </span>
                      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap min-w-0 flex-1">
                        {/* PDF Read Online */}
                        <button
                          id={`btn-read-pdf-${book.id}`}
                          onClick={() => setActiveReader({ book, mode: 'full' })}
                          className="rounded-full border-2 border-[#1c0ca3] text-[#1c0ca3] bg-white hover:bg-[#1c0ca3]/5 active:scale-95 transition-all text-[11px] sm:text-xs font-bold px-2.5 sm:px-4 py-1 sm:py-1.5 inline-flex items-center justify-center gap-1 cursor-pointer shadow-2xs select-none shrink-0 whitespace-nowrap"
                          title="Read PDF online"
                        >
                          <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#1c0ca3]" />
                          <span>Read Online</span>
                        </button>

                        {/* PDF Save/Read Offline */}
                        {isPdfDownloaded ? (
                          <div className="inline-flex items-center gap-1 shrink-0 flex-nowrap">
                            <button
                              id={`btn-read-pdf-offline-${book.id}`}
                              onClick={() => setActiveReader({ book, mode: 'offline' })}
                              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all text-[11px] sm:text-xs font-bold px-2.5 sm:px-4 py-1 sm:py-1.5 inline-flex items-center justify-center gap-1 cursor-pointer shadow-2xs select-none shrink-0 whitespace-nowrap"
                              title="Read saved offline PDF"
                            >
                              <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span>Read Offline</span>
                            </button>
                            {/* Prominent, accessible Delete button */}
                            <button
                              onClick={(e) => handleDeletePdfOffline(book.id, book.title, e)}
                              className="p-1 sm:p-1.5 rounded-full text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/80 transition-colors cursor-pointer shrink-0 shadow-2xs"
                              title="Delete offline PDF"
                              aria-label="Delete offline PDF"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600" />
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`btn-save-pdf-${book.id}`}
                            disabled={isPdfDownloading}
                            onClick={(e) => handleDownloadPdfOffline(book, e)}
                            className={`rounded-full text-white active:scale-95 transition-all text-[11px] sm:text-xs font-bold px-2.5 sm:px-4 py-1 sm:py-1.5 inline-flex items-center justify-center gap-1 cursor-pointer shadow-2xs select-none shrink-0 whitespace-nowrap ${
                              isPdfDownloading
                                ? 'bg-[#1c0ca3]/60 cursor-not-allowed'
                                : 'bg-[#1c0ca3] hover:bg-[#150980]'
                            }`}
                            title="Save PDF for offline reading"
                          >
                            {isPdfDownloading ? (
                              <>
                                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-white" />
                                <span>Saving ({pdfDlState.progress}%)</span>
                              </>
                            ) : (
                              <>
                                <div className="relative inline-flex items-center justify-center">
                                  <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                                </div>
                                <span>Save Offline</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 2: ePub */}
                    <div className="flex items-center gap-1.5 sm:gap-3 flex-nowrap min-w-0">
                      <span className="w-8 sm:w-10 shrink-0 text-xs sm:text-sm font-black text-[#1c0ca3] tracking-tight">
                        ePub
                      </span>
                      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap min-w-0 flex-1">
                        {/* ePub Read Online */}
                        <button
                          id={`btn-read-epub-${book.id}`}
                          onClick={() => setActiveMdReader({ book })}
                          className="rounded-full border-2 border-[#1c0ca3] text-[#1c0ca3] bg-white hover:bg-[#1c0ca3]/5 active:scale-95 transition-all text-[11px] sm:text-xs font-bold px-2.5 sm:px-4 py-1 sm:py-1.5 inline-flex items-center justify-center gap-1 cursor-pointer shadow-2xs select-none shrink-0 whitespace-nowrap"
                          title="Read ePub online"
                        >
                          <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#1c0ca3]" />
                          <span>Read Online</span>
                        </button>

                        {/* ePub Save/Read Offline */}
                        {isEpubDownloaded ? (
                          <div className="inline-flex items-center gap-1 shrink-0 flex-nowrap">
                            <button
                              id={`btn-read-epub-offline-${book.id}`}
                              onClick={() => setActiveMdReader({ book })}
                              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all text-[11px] sm:text-xs font-bold px-2.5 sm:px-4 py-1 sm:py-1.5 inline-flex items-center justify-center gap-1 cursor-pointer shadow-2xs select-none shrink-0 whitespace-nowrap"
                              title="Read saved offline ePub"
                            >
                              <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span>Read Offline</span>
                            </button>
                            {/* Prominent, accessible Delete button */}
                            <button
                              onClick={(e) => handleDeleteEpubOffline(book.id, book.title, e)}
                              className="p-1 sm:p-1.5 rounded-full text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/80 transition-colors cursor-pointer shrink-0 shadow-2xs"
                              title="Delete offline ePub"
                              aria-label="Delete offline ePub"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600" />
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`btn-save-epub-${book.id}`}
                            disabled={isEpubDownloading}
                            onClick={(e) => handleDownloadEpubOffline(book, e)}
                            className={`rounded-full text-white active:scale-95 transition-all text-[11px] sm:text-xs font-bold px-2.5 sm:px-4 py-1 sm:py-1.5 inline-flex items-center justify-center gap-1 cursor-pointer shadow-2xs select-none shrink-0 whitespace-nowrap ${
                              isEpubDownloading
                                ? 'bg-[#1c0ca3]/60 cursor-not-allowed'
                                : 'bg-[#1c0ca3] hover:bg-[#150980]'
                            }`}
                            title="Save ePub for offline reading"
                          >
                            {isEpubDownloading ? (
                              <>
                                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-white" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <div className="relative inline-flex items-center justify-center">
                                  <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                                </div>
                                <span>Save Offline</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Real-time In-App PDF Reader Modal */}
      {activeReader && (
        <PDFReaderModal
          book={activeReader.book}
          mode={activeReader.mode}
          onClose={() => setActiveReader(null)}
          isPurchased={true}
          initialPage={activeReader.initialPage}
        />
      )}

      {/* 4. Real-time In-App Markdown/ePub Reader Modal with sectional rendering & math */}
      {activeMdReader && (
        <MarkdownReaderModal
          book={activeMdReader.book}
          mode="full"
          onClose={() => setActiveMdReader(null)}
          isPurchased={true}
          initialSectionIndex={activeMdReader.initialSectionIndex}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-950 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 pointer-events-none">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
