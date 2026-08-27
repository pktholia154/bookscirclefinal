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
  Wifi,
  Receipt,
  FileText,
  ShieldCheck,
  Clock,
  ChevronRight,
  CreditCard,
  Layers,
} from 'lucide-react';
import { Book } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import {
  getPdfOffline,
  savePdfOffline,
  deleteOfflinePdf,
  getAllOfflineBookIds,
  isPdfOfflineAvailable,
  savePurchasedBookIds,
} from '@/lib/offline-storage';
import {
  getUserPurchaseHistory,
  syncUserPurchases,
  PurchaseRecord,
} from '@/lib/services/purchases';
import { PDFReaderModal } from '@/components/PDFReaderModal';
import { UserProfile } from '@/components/Header';

interface PurchasedViewProps {
  books: Book[];
  purchasedBookIds: string[];
  currentUser?: UserProfile | null;
  onSelectBook: (book: Book) => void;
  onNavigateHome: () => void;
  onUnlockDemoBook?: (bookId: string) => void;
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
  onUnlockDemoBook,
  onSyncPurchases,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'library' | 'invoices'>('library');
  const [offlineMap, setOfflineMap] = useState<Record<string, DownloadState>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'offline_only'>('all');
  const [activeReader, setActiveReader] = useState<{
    book: Book;
    mode: 'full' | 'offline';
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [invoices, setInvoices] = useState<PurchaseRecord[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

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

  // Fetch Firestore purchase invoices & receipts
  const fetchInvoices = useCallback(async () => {
    setIsLoadingInvoices(true);
    try {
      const userEmail = currentUser?.email || undefined;
      const userId = currentUser?.uid || undefined;
      const records = await getUserPurchaseHistory(userId, userEmail);
      setInvoices(records);
    } catch (e) {
      console.warn('Failed to fetch purchase invoices:', e);
    } finally {
      setIsLoadingInvoices(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeSubTab === 'invoices') {
      fetchInvoices();
    }
  }, [activeSubTab, fetchInvoices]);

  // Handle manual cloud sync
  const handleCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      if (onSyncPurchases) {
        await onSyncPurchases();
      } else {
        await syncUserPurchases(currentUser?.uid, currentUser?.email || undefined);
      }
      await refreshOfflineStatus();
      if (activeSubTab === 'invoices') {
        await fetchInvoices();
      }
      showToast('Library synchronized with Firebase DB!');
    } catch (e) {
      showToast('Cloud sync completed with local cache.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

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

        const allChunks = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          allChunks.set(chunk, position);
          position += chunk.length;
        }

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
      showToast('Could not save PDF offline. Check network.');
    }
  };

  // Delete downloaded offline PDF
  const handleDeleteOffline = async (bookId: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteOfflinePdf(bookId);
      setOfflineMap((prev) => {
        const copy = { ...prev };
        delete copy[bookId];
        return copy;
      });
      showToast(`Removed offline copy of "${title.slice(0, 20)}..."`);
    } catch {
      showToast('Failed to remove offline copy.');
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-6">
      {/* 1. Header with Cloud Sync & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-950">Purchased Library</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#4029AB] text-white">
              {purchasedBooks.length} Books
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Permanent access to your verified study materials &amp; PDF downloads.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-tab Navigation */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/80">
            <button
              onClick={() => setActiveSubTab('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'library'
                  ? 'bg-white text-[#4029AB] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>My Books</span>
            </button>
            <button
              onClick={() => setActiveSubTab('invoices')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'invoices'
                  ? 'bg-white text-[#4029AB] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Receipts &amp; Records</span>
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleCloudSync}
            disabled={isSyncingCloud}
            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
            title="Synchronize purchased books from Firebase DB"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4029AB] ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Cloud</span>
          </button>
        </div>
      </div>

      {/* 2. TAB: INVOICES & PURCHASE RECORDS */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-gray-900">
                Verified Firebase DB Transaction Records
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">
              {currentUser?.email || 'Active Reader'}
            </span>
          </div>

          {isLoadingInvoices ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-[#4029AB] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-gray-500">
                Retrieving your purchase history from Firebase...
              </p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-14 text-center bg-gray-50 rounded-3xl border border-gray-200/80 space-y-3 p-6">
              <Receipt className="w-10 h-10 text-gray-400 mx-auto" />
              <h3 className="text-sm font-bold text-gray-900">No Online Invoices Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Completed purchases made via Razorpay will be permanently archived here with their payment and order IDs.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.paymentId}
                  className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white hover:border-[#4029AB]/30 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>{inv.status?.toUpperCase() || 'VERIFIED'}</span>
                        </span>
                        <span className="text-xs font-mono font-bold text-gray-900">
                          {inv.paymentId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{new Date(inv.purchasedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        <span>•</span>
                        <span>Order: {inv.orderId}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-gray-950 font-mono">
                        ₹{inv.amount}
                      </span>
                      <p className="text-[10px] text-gray-400">Razorpay Gateway</p>
                    </div>
                  </div>

                  {/* Books in this invoice */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      Purchased Items ({inv.books?.length || 0})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {inv.books?.map((b) => {
                        const matchedBook = books.find((orig) => orig.id === b.id);
                        return (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2"
                          >
                            <span className="text-xs font-bold text-gray-800 truncate">
                              {b.title}
                            </span>
                            {matchedBook && (
                              <button
                                onClick={() => setActiveReader({ book: matchedBook, mode: 'full' })}
                                className="px-2.5 py-1 rounded-lg bg-[#4029AB] text-white text-[10px] font-bold shrink-0 hover:bg-[#34208e] cursor-pointer"
                              >
                                Read PDF
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. TAB: ACTIVE LIBRARY (GRID OF E-BOOKS) */}
      {activeSubTab === 'library' && (
        <>
          {/* Quick Filter Bar */}
          {purchasedBooks.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-[#4029AB] text-white shadow-2xs'
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
                  <span>Downloaded Offline</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {purchasedBooks.length === 0 ? (
            <div className="py-16 text-center bg-gray-50 rounded-3xl border border-gray-200/80 space-y-4 p-6">
              <div className="w-16 h-16 rounded-full bg-purple-100/60 text-[#4029AB] flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">Your Library is Empty</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Browse our catalog of study guides and competitive exam preparation e-books. All purchases include offline access.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  id="empty-library-browse-btn"
                  onClick={onNavigateHome}
                  className="px-5 py-2.5 bg-[#4029AB] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#34208e] cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Explore E-Books</span>
                </button>

                {onUnlockDemoBook && (
                  <button
                    onClick={() => onUnlockDemoBook('1')}
                    className="px-4 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#4029AB]" />
                    <span>Try Sample Demo E-Book</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Books Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPurchasedBooks.map((book) => {
                const dlState = offlineMap[book.id] || { status: 'idle', progress: 0, loadedMb: 0, totalMb: 0 };
                const isDownloaded = dlState.status === 'downloaded';
                const isDownloading = dlState.status === 'downloading';

                return (
                  <div
                    key={book.id}
                    className="p-4 rounded-2xl border border-gray-200/90 bg-white hover:border-[#4029AB]/40 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                  >
                    {/* Top Info Section */}
                    <div
                      className="flex gap-3.5 cursor-pointer"
                      onClick={() => onSelectBook(book)}
                    >
                      {/* Cover */}
                      <div className="relative w-18 sm:w-20 aspect-[3/4] shrink-0 rounded-none overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs">
                        <Image
                          src={book.cover || DEFAULT_BOOK_COVER}
                          alt={book.title}
                          fill
                          unoptimized
                          sizes="80px"
                          className="object-cover rounded-none group-hover:scale-103 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-[#4029AB] uppercase tracking-wider bg-[#4029AB]/10 px-1.5 py-0.5 rounded">
                              {book.category || 'EXAM'}
                            </span>
                            {isDownloaded && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" />
                                <span>Saved Offline</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-gray-950 mt-1 line-clamp-2 leading-snug group-hover:text-[#4029AB] transition-colors">
                            {book.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-2">
                          <span>{book.pages || 320} Pages</span>
                          <span>•</span>
                          <span>{book.language || 'English'}</span>
                          <span>•</span>
                          <span>{book.file_size || '12.5 MB'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {isDownloading && (
                      <div className="p-3 bg-purple-50/70 border border-[#4029AB]/20 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold text-[#4029AB]">
                          <span className="flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Downloading to device storage...</span>
                          </span>
                          <span>{dlState.progress}%</span>
                        </div>

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

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 pt-1 border-t border-gray-100 flex-wrap">
                      <button
                        id={`btn-read-online-${book.id}`}
                        onClick={() => setActiveReader({ book, mode: 'full' })}
                        className="flex-1 min-w-[130px] py-2 px-3.5 rounded-xl border border-[#4029AB] text-[#4029AB] hover:bg-[#4029AB]/10 active:scale-98 transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Read PDF online instantly"
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        <span>Read Online</span>
                      </button>

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
                              <span>Save Offline</span>
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
        </>
      )}

      {/* 4. Real-time In-App PDF Reader Modal */}
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
