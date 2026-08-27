'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  BookOpen,
  Download,
  Check,
  HardDrive,
  Trash2,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  WifiOff,
  Wifi
} from 'lucide-react';
import { Book } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import {
  getPdfOffline,
  savePdfOffline,
  deleteOfflinePdf,
  getAllOfflineBookIds,
  isPdfOfflineAvailable,
  savePurchasedBookIds
} from '@/lib/offline-storage';
import { PDFReaderModal } from '@/components/PDFReaderModal';

interface PurchasedViewProps {
  books: Book[];
  purchasedBookIds: string[];
  onSelectBook: (book: Book) => void;
  onNavigateHome: () => void;
  onUnlockDemoBook?: (bookId: string) => void;
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
  onSelectBook,
  onNavigateHome,
  onUnlockDemoBook,
}) => {
  const [offlineMap, setOfflineMap] = useState<Record<string, DownloadState>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'offline_only'>('all');
  const [activeReader, setActiveReader] = useState<{
    book: Book;
    mode: 'full' | 'offline';
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync offline status from IndexedDB
  const refreshOfflineStatus = useCallback(async () => {
    try {
      const offlineIds = await getAllOfflineBookIds();
      const newMap: Record<string, DownloadState> = {};
      offlineIds.forEach((id) => {
        newMap[id] = {
          status: 'downloaded',
          progress: 100,
          loadedMb: 0,
          totalMb: 0,
        };
      });
      setOfflineMap((prev) => ({ ...prev, ...newMap }));
    } catch (e) {
      console.warn('Failed to load offline keys:', e);
    }
  }, []);

  useEffect(() => {
    refreshOfflineStatus();
  }, [refreshOfflineStatus]);

  // Purchased books list
  const purchasedBooks = books.filter((b) => purchasedBookIds.includes(b.id));

  // Filtered by offline mode filter only
  const filteredPurchasedBooks = purchasedBooks.filter((book) => {
    const isOffline = offlineMap[book.id]?.status === 'downloaded';
    return filterMode === 'all' || (filterMode === 'offline_only' && isOffline);
  });

  // Handle Download PDF to device IndexedDB with real streaming progress
  const handleDownloadOffline = async (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const targetUrl = book.pdf_file || book.sample_file;
    if (!targetUrl) {
      showToast('No PDF source URL available for this book.');
      return;
    }

    // Set downloading state
    setOfflineMap((prev) => ({
      ...prev,
      [book.id]: {
        status: 'downloading',
        progress: 10,
        loadedMb: 0.5,
        totalMb: parseFloat(book.file_size || '12.5'),
      },
    }));

    try {
      // Stream fetch either directly or through server proxy
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

            setOfflineMap((prev) => ({
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

        // Combine chunks into single ArrayBuffer
        const allChunks = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          allChunks.set(chunk, position);
          position += chunk.length;
        }

        // Save into IndexedDB for secure in-app offline reading
        await savePdfOffline(book.id, allChunks.buffer);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        await savePdfOffline(book.id, arrayBuffer);
      }

      setOfflineMap((prev) => ({
        ...prev,
        [book.id]: {
          status: 'downloaded',
          progress: 100,
          loadedMb: totalMbNum,
          totalMb: totalMbNum,
        },
      }));

      showToast(`"${book.title.slice(0, 22)}..." saved for offline reading!`);
    } catch (err: any) {
      console.error('Download offline error:', err);
      setOfflineMap((prev) => ({
        ...prev,
        [book.id]: {
          status: 'error',
          progress: 0,
          loadedMb: 0,
          totalMb: 0,
          errorMsg: err?.message || 'Download failed',
        },
      }));
      showToast('Download failed. Please check internet connection.');
    }
  };

  // Delete Offline Copy
  const handleDeleteOffline = async (bookId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteOfflinePdf(bookId);
      setOfflineMap((prev) => ({
        ...prev,
        [bookId]: {
          status: 'idle',
          progress: 0,
          loadedMb: 0,
          totalMb: 0,
        },
      }));
      showToast(`Removed offline copy of "${title.slice(0, 20)}..."`);
    } catch (err) {
      console.error('Failed to delete offline PDF:', err);
    }
  };

  // Handle Quick Sample Unlock for testing if library is empty
  const handleQuickUnlockSample = () => {
    if (books.length === 0) return;
    const firstBook = books[0];
    savePurchasedBookIds([firstBook.id]);
    if (onUnlockDemoBook) {
      onUnlockDemoBook(firstBook.id);
    }
    showToast(`Unlocked "${firstBook.title.slice(0, 24)}..." to your library!`);
  };

  const totalOfflineDownloaded = Object.values(offlineMap).filter(
    (s) => s.status === 'downloaded'
  ).length;

  return (
    <div className="w-full px-2 sm:px-6 py-2.5 sm:py-5 max-w-4xl mx-auto space-y-3 sm:space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b border-gray-100 pb-2.5 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-black text-gray-950 tracking-tight">
              Purchased E-Books
            </h1>
            <span className="bg-[#4029AB] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {purchasedBooks.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
            Access your unlocked digital library online or download to device storage for offline study.
          </p>
        </div>

        {/* Offline summary badge */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 shrink-0 self-start sm:self-auto">
          <HardDrive className="w-4 h-4 text-[#4029AB]" />
          <span>
            <strong className="text-gray-950">{totalOfflineDownloaded}</strong> of{' '}
            <strong className="text-gray-950">{purchasedBooks.length}</strong> Offline Ready
          </span>
        </div>
      </div>

      {/* 2. Filter Bar (if has purchased books) */}
      {purchasedBooks.length > 0 && (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#4029AB] text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({purchasedBooks.length})
          </button>
          <button
            onClick={() => setFilterMode('offline_only')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'offline_only'
                ? 'bg-[#4029AB] text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Downloaded ({totalOfflineDownloaded})</span>
          </button>
        </div>
      )}

      {/* 3. Empty State (No purchased books yet) */}
      {purchasedBooks.length === 0 ? (
        <div className="py-14 px-6 text-center bg-gray-50/70 rounded-3xl border border-gray-200/80 max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-950">No purchased books in your library</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-sm mx-auto">
              Books you buy from the store will appear here immediately with high-speed online vector reading and device offline storage.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              onClick={onNavigateHome}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#4029AB] hover:bg-[#34208e] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Catalog</span>
            </button>

            {books.length > 0 && (
              <button
                onClick={handleQuickUnlockSample}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#4029AB]" />
                <span>Unlock Sample Book</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredPurchasedBooks.length === 0 ? (
        /* Empty search results */
        <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-500 space-y-2">
          <p className="font-semibold text-gray-800">No books found matching your filter.</p>
          <button
            onClick={() => {
              setFilterMode('all');
            }}
            className="text-[#4029AB] font-bold hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* 4. Purchased Books List */
        <div className="space-y-2 sm:space-y-3.5">
          {filteredPurchasedBooks.map((book) => {
            const dlState = offlineMap[book.id] || {
              status: 'idle',
              progress: 0,
              loadedMb: 0,
              totalMb: 0,
            };
            const isDownloaded = dlState.status === 'downloaded';
            const isDownloading = dlState.status === 'downloading';

            return (
              <div
                key={book.id}
                id={`purchased-book-${book.id}`}
                className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200 bg-white hover:border-[#4029AB]/40 hover:shadow-md transition-all space-y-2.5 sm:space-y-3.5"
              >
                {/* Book Card Main Info */}
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Sharp 3:4 Cover Ratio */}
                  <div
                    onClick={() => onSelectBook(book)}
                    className="relative w-14 sm:w-20 aspect-[3/4] rounded-none overflow-hidden shrink-0 bg-gray-100 border border-gray-200 shadow-2xs cursor-pointer group"
                  >
                    <Image
                      src={book.cover || DEFAULT_BOOK_COVER}
                      alt={book.title}
                      fill
                      unoptimized
                      sizes="80px"
                      className="object-cover rounded-none group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 flex flex-col justify-start self-stretch">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4029AB] bg-[#4029AB]/10 px-2 py-0.5 rounded">
                        {book.category}
                      </span>
                      {isDownloaded && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Offline Ready
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => onSelectBook(book)}
                      className="font-bold text-xs sm:text-base text-gray-950 leading-snug mt-1 cursor-pointer hover:text-[#4029AB] transition-colors"
                    >
                      {book.title}
                    </h3>
                  </div>
                </div>

                {/* Download Progress Bar & Status (Shown when downloading or error) */}
                {isDownloading && (
                  <div className="p-3 bg-purple-50/70 border border-[#4029AB]/20 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-[#4029AB]">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Downloading to device storage...</span>
                      </span>
                      <span>{dlState.progress}%</span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 bg-purple-200/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4029AB] rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${dlState.progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Secure in-app storage</span>
                      <span>
                        {dlState.loadedMb} MB / {dlState.totalMb || 12} MB
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons: 'Read Online' and 'Offline' */}
                <div className="flex items-center gap-2.5 pt-1 border-t border-gray-100 flex-wrap">
                  {/* 1. Read Online Button */}
                  <button
                    id={`btn-read-online-${book.id}`}
                    onClick={() => setActiveReader({ book, mode: 'full' })}
                    className="flex-1 min-w-[130px] py-2 px-3.5 rounded-xl border border-[#4029AB] text-[#4029AB] hover:bg-[#4029AB]/10 active:scale-98 transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Read PDF online instantly"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Read Online</span>
                  </button>

                  {/* 2. Offline Action Button */}
                  {isDownloaded ? (
                    <div className="flex-1 min-w-[130px] flex items-center gap-1.5">
                      <button
                        id={`btn-read-offline-${book.id}`}
                        onClick={() => setActiveReader({ book, mode: 'offline' })}
                        className="flex-1 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98 transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        title="Read PDF from device offline storage"
                      >
                        <WifiOff className="w-3.5 h-3.5" />
                        <span>Read Offline</span>
                      </button>

                      {/* Remove Offline Copy Button */}
                      <button
                        onClick={(e) => handleDeleteOffline(book.id, book.title, e)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete offline file to free storage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`btn-download-offline-${book.id}`}
                      disabled={isDownloading}
                      onClick={(e) => handleDownloadOffline(book, e)}
                      className={`flex-1 min-w-[130px] py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98 ${
                        isDownloading
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-[#4029AB] hover:bg-[#34208e] text-white'
                      }`}
                      title="Download PDF to device for offline reading"
                    >
                      {isDownloading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Downloading ({dlState.progress}%)</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Offline</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Real-time In-App PDF Reader Modal */}
      {activeReader && (
        <PDFReaderModal
          book={activeReader.book}
          mode={activeReader.mode}
          onClose={() => setActiveReader(null)}
          isPurchased={true}
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
