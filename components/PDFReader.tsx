'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ZoomIn, ZoomOut, AlertCircle, Download, CheckCircle2, ShieldCheck, Lock, Sparkles, ShoppingBag } from 'lucide-react';
import { fetchFirestoreBookBySlugOrId } from '@/lib/books-store';
import { getPdfOffline, getPurchasedBookIdsFromLocal } from '@/lib/offline-storage';
import { createEngine, PdfEngine, PdfDocument } from 'clawpdf/browser';
import { resolveBookSampleUrl, getVerifiedFullPdfSignedUrl, resolveFullBookStoragePath } from '@/lib/services/storage';

export default function PDFReader() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookIdParam = params?.bookId;
  const rawBookId = Array.isArray(bookIdParam) ? bookIdParam[0] : bookIdParam;
  const decodedBookId = rawBookId ? decodeURIComponent(rawBookId) : '';

  const readType = searchParams?.get('type') || searchParams?.get('mode') || 'full';
  const explicitUrl = searchParams?.get('file') || searchParams?.get('url');

  const [bookTitle, setBookTitle] = useState<string>('PDF Book Viewer');
  const [bookData, setBookData] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isUrlResolved, setIsUrlResolved] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);

  const [isPdfLoaded, setIsPdfLoaded] = useState<boolean>(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [fitToWidth, setFitToWidth] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState(true);
  const [noUrlError, setNoUrlError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const scrollViewRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const pageWrappersRef = useRef<HTMLDivElement[]>([]);
  const pageCanvasesRef = useRef<HTMLCanvasElement[]>([]);
  const pageRenderStatesRef = useRef<boolean[]>([]);
  const renderObserverRef = useRef<IntersectionObserver | null>(null);
  const activePageObserverRef = useRef<IntersectionObserver | null>(null);

  const engineRef = useRef<PdfEngine | null>(null);
  const pdfDocRef = useRef<PdfDocument | null>(null);
  const rawBufferRef = useRef<ArrayBuffer | null>(null);

  const scaleRef = useRef<number>(1.0);
  const fitToWidthRef = useRef<boolean>(true);

  // Sync refs
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    fitToWidthRef.current = fitToWidth;
  }, [fitToWidth]);

  // 1. Resolve Target PDF URL from Search Params or Firestore
  useEffect(() => {
    let active = true;

    async function resolveUrl() {
      if (readType === 'offline') {
        if (active) {
          setIsUrlResolved(true);
          setFileUrl('offline');
        }
        return;
      }

      let resolvedTargetUrl = '';

      if (decodedBookId) {
        try {
          const purchasedIds = getPurchasedBookIdsFromLocal();
          const userOwnsBook = purchasedIds.includes(decodedBookId);
          setIsPurchased(userOwnsBook);

          const fetchedBook = await fetchFirestoreBookBySlugOrId(decodedBookId);
          if (active && fetchedBook) {
            setBookData(fetchedBook);
            if (fetchedBook.title) setBookTitle(fetchedBook.title);

            if (readType === 'sample') {
              // Public Sample PDF for all visitors
              resolvedTargetUrl = resolveBookSampleUrl(fetchedBook.sample_file || fetchedBook.sampleUrl, fetchedBook.id);
            } else {
              // Full PDF: Check purchase and get verified signed URL
              const signed = await getVerifiedFullPdfSignedUrl({
                bookId: fetchedBook.id,
                pdfStoragePath: fetchedBook.pdfStoragePath || fetchedBook.pdf_file,
              });
              resolvedTargetUrl = signed.secureProxyUrl || signed.url;
            }
          }
        } catch (e) {
          console.warn('Error fetching book details for reader:', e);
        }
      }

      const finalUrl = resolvedTargetUrl || (explicitUrl ? decodeURIComponent(explicitUrl) : '');

      if (active) {
        if (finalUrl) {
          setFileUrl(finalUrl);
          setIsUrlResolved(true);
        } else {
          setNoUrlError(true);
          setIsLoading(false);
          setIsUrlResolved(true);
        }
      }
    }

    resolveUrl();

    return () => {
      active = false;
    };
  }, [explicitUrl, decodedBookId, readType]);

  // Render a single page canvas with exact proportional scaling and high-DPI sharpness
  const renderPage = useCallback(
    async (num: number, canvas: HTMLCanvasElement, wrapper: HTMLDivElement) => {
      const doc = pdfDocRef.current;
      if (!doc) return;

      try {
        const page = doc.page(num);
        const unscaledWidth = page.width;
        const unscaledHeight = page.height;

        let renderScale = scaleRef.current;
        const container = scrollViewRef.current;
        const availableWidth = container
          ? Math.max(container.clientWidth - 24, 280)
          : window.innerWidth - 24;

        if (fitToWidthRef.current && availableWidth > 0) {
          renderScale = availableWidth / unscaledWidth;
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
        let targetScale = renderScale * dpr;
        if (targetScale > 4.0) targetScale = 4.0;

        const aspectWidth = Math.floor(unscaledWidth * renderScale);
        const aspectHeight = Math.floor(unscaledHeight * renderScale);

        canvas.style.width = `${aspectWidth}px`;
        canvas.style.maxWidth = 'none';
        canvas.style.height = 'auto';
        canvas.style.aspectRatio = `${aspectWidth} / ${aspectHeight}`;

        if (wrapper) {
          wrapper.style.maxWidth = `${aspectWidth}px`;
          wrapper.style.aspectRatio = `${aspectWidth} / ${aspectHeight}`;
        }

        const scaleKey = `${renderScale.toFixed(4)}_${dpr}`;
        if (canvas.getAttribute('data-render-key') === scaleKey) {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
        const { width: pixelWidth, height: pixelHeight, rgba } = page.render({
          scale: targetScale,
          background: 'white',
        });

        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          const clampedArray = new Uint8ClampedArray(rgba.buffer as ArrayBuffer);
          const imageData = new ImageData(
            clampedArray,
            pixelWidth,
            pixelHeight
          );
          ctx.putImageData(imageData, 0, 0);
        }
        canvas.setAttribute('data-render-key', scaleKey);
      } catch (err: any) {
        console.warn(`Render error on page ${num}:`, err);
        pageRenderStatesRef.current[num] = false;
      }
    },
    []
  );

  // Setup Pages and Intersection Observers
  const setupPages = useCallback(async () => {
    const doc = pdfDocRef.current;
    const canvasContainer = canvasContainerRef.current;
    const scrollView = scrollViewRef.current;
    if (!doc || !canvasContainer || !scrollView) return;

    if (renderObserverRef.current) renderObserverRef.current.disconnect();
    if (activePageObserverRef.current) activePageObserverRef.current.disconnect();

    canvasContainer.replaceChildren();
    pageWrappersRef.current = [];
    pageCanvasesRef.current = [];
    pageRenderStatesRef.current = new Array(doc.pageCount + 1).fill(false);

    let sampleAspect = '1 / 1.414';
    let initialAspectWidth = 0;
    try {
      const page1 = doc.page(1);
      let initialScale = scaleRef.current;
      if (fitToWidthRef.current && scrollView) {
        const availableWidth = Math.max(scrollView.clientWidth - 24, 280);
        initialScale = availableWidth / page1.width;
      }
      sampleAspect = `${page1.width} / ${page1.height}`;
      initialAspectWidth = Math.floor(page1.width * initialScale);
    } catch (e) {
      console.warn('Could not inspect page 1 viewport:', e);
    }

    renderObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-num') || '1', 10);
            if (!pageRenderStatesRef.current[pageNum]) {
              pageRenderStatesRef.current[pageNum] = true;
              const canvasEl = entry.target.querySelector('canvas');
              if (canvasEl) {
                renderPage(pageNum, canvasEl as HTMLCanvasElement, entry.target as HTMLDivElement);
              }
            }
          }
        });
      },
      { root: scrollView, rootMargin: '600px 0px' }
    );

    activePageObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-num') || '1', 10);
            setCurrentPage(pageNum);
          }
        });
      },
      { root: scrollView, threshold: 0.25 }
    );

    for (let i = 1; i <= doc.pageCount; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-wrapper my-3 bg-white shadow-sm border border-slate-200';
      wrapper.setAttribute('data-page-num', i.toString());
      wrapper.style.aspectRatio = sampleAspect;
      if (initialAspectWidth > 0) {
        wrapper.style.maxWidth = `${initialAspectWidth}px`;
      }

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas block';
      canvas.setAttribute('data-page-num', i.toString());
      if (initialAspectWidth > 0) {
        canvas.style.width = `${initialAspectWidth}px`;
        canvas.style.aspectRatio = sampleAspect;
      }

      wrapper.appendChild(canvas);
      canvasContainer.appendChild(wrapper);

      pageWrappersRef.current.push(wrapper);
      pageCanvasesRef.current.push(canvas);

      renderObserverRef.current.observe(wrapper);
      activePageObserverRef.current.observe(wrapper);
    }
  }, [renderPage]);

  // Update zoom CSS and re-trigger renders without destroying the DOM
  const applyZoom = useCallback(async () => {
    const doc = pdfDocRef.current;
    if (!doc) return;

    try {
      const page1 = doc.page(1);

      let renderScale = scaleRef.current;
      const container = scrollViewRef.current;
      const availableWidth = container
        ? Math.max(container.clientWidth - 24, 280)
        : window.innerWidth - 24;

      if (fitToWidthRef.current && availableWidth > 0) {
        renderScale = availableWidth / page1.width;
      }

      const aspectWidth = Math.floor(page1.width * renderScale);
      const aspectHeight = Math.floor(page1.height * renderScale);
      const sampleAspect = `${aspectWidth} / ${aspectHeight}`;

      pageWrappersRef.current.forEach((wrapper) => {
        if (wrapper) {
          wrapper.style.maxWidth = `${aspectWidth}px`;
          wrapper.style.aspectRatio = sampleAspect;
        }
      });

      pageCanvasesRef.current.forEach((canvas) => {
        if (canvas) {
          canvas.style.width = `${aspectWidth}px`;
          canvas.style.aspectRatio = sampleAspect;
        }
      });

      pageRenderStatesRef.current.fill(false);

      pageWrappersRef.current.forEach((wrapper, index) => {
        if (wrapper) {
          const rect = wrapper.getBoundingClientRect();
          if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
            const pageNum = index + 1;
            const canvasEl = pageCanvasesRef.current[index];
            if (canvasEl) {
              pageRenderStatesRef.current[pageNum] = true;
              renderPage(pageNum, canvasEl, wrapper);
            }
          }
        }
      });

      if (renderObserverRef.current) {
        renderObserverRef.current.disconnect();
        requestAnimationFrame(() => {
          if (renderObserverRef.current) {
            pageWrappersRef.current.forEach((wrapper) => {
              if (wrapper) renderObserverRef.current!.observe(wrapper);
            });
          }
        });
      }
    } catch (e) {
      console.warn('Error applying zoom:', e);
    }
  }, [renderPage]);

  // Main PDF loading runner using PDFium WASM
  useEffect(() => {
    if (!isUrlResolved || !fileUrl || noUrlError) return;

    let active = true;

    async function initPdfEngine() {
      try {
        let arrayBuffer: ArrayBuffer;

        if (readType === 'offline') {
          const data = await getPdfOffline(decodedBookId);
          if (!data) throw new Error('Offline PDF not found');
          arrayBuffer = data;
        } else {
          const response = await fetch(fileUrl, { mode: 'cors' });
          if (!response.ok) throw new Error('Network response not OK');
          arrayBuffer = await response.arrayBuffer();
        }

        if (!active) return;

        rawBufferRef.current = arrayBuffer;

        if (pdfDocRef.current) pdfDocRef.current[Symbol.dispose]();
        if (engineRef.current) engineRef.current.destroy();

        const engine = await createEngine({
          wasmUrl: 'https://unpkg.com/clawpdf@0.3.1/dist/vendor/pdfium.esm.wasm',
        });
        engineRef.current = engine;

        const doc = await engine.open(new Uint8Array(arrayBuffer));

        if (!active) {
          doc[Symbol.dispose]();
          engine.destroy();
          return;
        }

        pdfDocRef.current = doc;
        setIsPdfLoaded(true);
        setNumPages(doc.pageCount);
        setIsLoading(false);

        setupPages();
      } catch (fetchErr) {
        if (readType === 'offline') {
          console.error('Failed to load offline PDF', fetchErr);
          if (active) {
            setNoUrlError(true);
            setIsLoading(false);
          }
          return;
        }

        console.warn('Direct fetch failed. Attempting proxy load...', fetchErr);
        if (!active) return;
        tryProxyLoad();
      }
    }

    async function tryProxyLoad() {
      const proxyUrl = '/api/pdf?url=' + encodeURIComponent(fileUrl) + '&bookId=' + encodeURIComponent(decodedBookId || '');

      try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Proxy response not OK');
        const arrayBuffer = await response.arrayBuffer();

        if (!active) return;

        rawBufferRef.current = arrayBuffer;

        if (pdfDocRef.current) pdfDocRef.current[Symbol.dispose]();
        if (engineRef.current) engineRef.current.destroy();

        const engine = await createEngine({
          wasmUrl: 'https://unpkg.com/clawpdf@0.3.1/dist/vendor/pdfium.esm.wasm',
        });
        engineRef.current = engine;

        const doc = await engine.open(new Uint8Array(arrayBuffer));

        if (!active) {
          doc[Symbol.dispose]();
          engine.destroy();
          return;
        }

        pdfDocRef.current = doc;
        setIsPdfLoaded(true);
        setNumPages(doc.pageCount);
        setIsLoading(false);

        setupPages();
      } catch (error) {
        console.error('PDFium WASM failed to load document.', error);
        if (!active) return;
        setNoUrlError(true);
        setIsLoading(false);
      }
    }

    initPdfEngine();

    return () => {
      active = false;
      if (renderObserverRef.current) renderObserverRef.current.disconnect();
      if (activePageObserverRef.current) activePageObserverRef.current.disconnect();

      if (pdfDocRef.current) pdfDocRef.current[Symbol.dispose]();
      if (engineRef.current) engineRef.current.destroy();
    };
  }, [fileUrl, isUrlResolved, noUrlError, setupPages, decodedBookId, readType]);

  const handleDownload = () => {
    if (!rawBufferRef.current) return;
    setIsDownloading(true);
    try {
      const blob = new Blob([rawBufferRef.current], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const cleanTitle = bookTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${cleanTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-white text-slate-900 flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer shrink-0"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{bookTitle}</h2>
            <span className="text-[10px] text-slate-500 font-semibold">
              {readType === 'sample' ? 'Sample Preview' : 'Full eBook'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPdfLoaded && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#4029AB]" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div id="viewer-container" className="relative w-full h-full flex-1 overflow-auto bg-white">
        {noUrlError && (
          <div className="m-auto text-center text-red-500 p-6 mt-20 max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl space-y-2">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Failed to load PDF</h3>
            <p className="text-xs text-slate-500">
              Please check the book file link or ensure the book exists.
            </p>
          </div>
        )}

        {!noUrlError && (
          <div id="pdf-scroll-view" ref={scrollViewRef} className="h-full w-full overflow-y-auto p-4">
            {isLoading && (
              <div
                id="loading-spinner"
                className="flex flex-col items-center justify-center h-full gap-4 text-slate-500"
              >
                <Loader2 className="w-8 h-8 animate-spin text-[#4029AB]" />
                <p className="text-xs font-semibold text-slate-700">
                  Initializing PDFium WASM Engine...
                </p>
                <p className="text-[11px] max-w-[260px] text-center text-slate-500">
                  Loading high-precision WebAssembly vector engine.
                </p>
              </div>
            )}
            <div
              ref={canvasContainerRef}
              className="w-max min-w-full mx-auto flex flex-col items-center origin-top pb-24"
            />

            {/* End of sample preview CTA */}
            {readType === 'sample' && !isPurchased && !isLoading && numPages > 0 && (
              <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-3.5 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900">End of Sample Preview</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You have reached the end of this dedicated sample preview ({numPages} {numPages === 1 ? 'page' : 'pages'}). Purchase the complete e-book {bookData?.pages ? `(${bookData.pages} pages)` : ''} with full syllabus coverage, answers, and offline downloads.
                  </p>
                </div>
                {bookData && (
                  <button
                    onClick={() => router.push(`/book/${bookData.slug || bookData.id}`)}
                    className="w-full py-3 rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white font-bold text-xs shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Purchase Complete eBook (₹{bookData.buy_price})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!noUrlError && !isLoading && isPdfLoaded && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center bg-white/90 backdrop-blur-md border border-slate-200 px-4 py-1.5 rounded-full shadow-lg z-[150]">
            <span className="text-xs font-semibold text-slate-700">
              Page {currentPage} of {numPages || '-'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
