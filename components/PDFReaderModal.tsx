'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Download,
  BookOpen,
  Sparkles,
  ShoppingBag,
  RotateCcw
} from 'lucide-react';
import { createEngine, PdfEngine, PdfDocument } from 'clawpdf/browser';
import { Book } from '@/lib/types';

interface PDFReaderModalProps {
  book: Book;
  mode: 'sample' | 'full';
  onClose: () => void;
  onBuyNow?: (book: Book) => void;
  isPurchased?: boolean;
}

export const PDFReaderModal: React.FC<PDFReaderModalProps> = ({
  book,
  mode,
  onClose,
  onBuyNow,
  isPurchased = false,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [fitToWidth, setFitToWidth] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollViewRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const pageWrappersRef = useRef<HTMLDivElement[]>([]);
  const pageCanvasesRef = useRef<HTMLCanvasElement[]>([]);
  const pageRenderStatesRef = useRef<boolean[]>([]);
  const renderObserverRef = useRef<IntersectionObserver | null>(null);
  const activePageObserverRef = useRef<IntersectionObserver | null>(null);

  const engineRef = useRef<PdfEngine | null>(null);
  const pdfDocRef = useRef<PdfDocument | null>(null);

  const scaleRef = useRef<number>(1.0);
  const fitToWidthRef = useRef<boolean>(true);

  // Sync ref values
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    fitToWidthRef.current = fitToWidth;
  }, [fitToWidth]);

  // Determine target PDF URL
  const targetPdfUrl = useMemo(() => {
    if (mode === 'sample') {
      return book.sample_file || book.pdf_file || '';
    }
    return book.pdf_file || book.sample_file || '';
  }, [book, mode]);

  // Maximum pages visible in sample mode (if sample file has many pages, limit to 5 pages for sample)
  const maxSamplePages = 5;

  // Render a single page canvas with exact proportional scaling and high-DPI sharpness
  const renderPage = useCallback(
    async (num: number, canvas: HTMLCanvasElement, wrapper: HTMLDivElement) => {
      const doc = pdfDocRef.current;
      if (!doc) return;

      try {
        const page = doc.page(num);
        const unscaledWidth = page.width;
        const unscaledHeight = page.height;

        // Determine zoom scale based on fitToWidth or user zoom
        let renderScale = scaleRef.current;
        const container = scrollViewRef.current;
        const availableWidth = container
          ? Math.max(container.clientWidth - 32, 280)
          : window.innerWidth - 32;

        if (fitToWidthRef.current && availableWidth > 0) {
          renderScale = availableWidth / unscaledWidth;
        }

        // High-DPI super-sampling
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
  const setupPages = useCallback(
    async (totalPages: number) => {
      const doc = pdfDocRef.current;
      const canvasContainer = canvasContainerRef.current;
      const scrollView = scrollViewRef.current;
      if (!doc || !canvasContainer || !scrollView) return;

      if (renderObserverRef.current) renderObserverRef.current.disconnect();
      if (activePageObserverRef.current) activePageObserverRef.current.disconnect();

      canvasContainer.replaceChildren();
      pageWrappersRef.current = [];
      pageCanvasesRef.current = [];
      pageRenderStatesRef.current = new Array(totalPages + 1).fill(false);

      let sampleAspect = '1 / 1.414';
      let initialAspectWidth = 0;
      try {
        const page1 = doc.page(1);
        let initialScale = scaleRef.current;
        if (fitToWidthRef.current && scrollView) {
          const availableWidth = Math.max(scrollView.clientWidth - 32, 280);
          initialScale = availableWidth / page1.width;
        }
        sampleAspect = `${page1.width} / ${page1.height}`;
        initialAspectWidth = Math.floor(page1.width * initialScale);
      } catch (e) {
        console.warn('Could not inspect page 1 viewport:', e);
      }

      // IntersectionObserver for lazy rendering
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

      // IntersectionObserver for active page tracking
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

      // Limit pages in sample mode if needed
      const renderCount = mode === 'sample' && !isPurchased ? Math.min(totalPages, maxSamplePages) : totalPages;

      for (let i = 1; i <= renderCount; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-page-wrapper relative my-3 shadow-md bg-white border border-gray-200 transition-all';
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
    },
    [renderPage, mode, isPurchased]
  );

  // Apply zoom changes across existing canvases
  const applyZoom = useCallback(async () => {
    const doc = pdfDocRef.current;
    if (!doc) return;

    try {
      const page1 = doc.page(1);

      let renderScale = scaleRef.current;
      const container = scrollViewRef.current;
      const availableWidth = container
        ? Math.max(container.clientWidth - 32, 280)
        : window.innerWidth - 32;

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
          if (rect.top < window.innerHeight + 300 && rect.bottom > -300) {
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

  // Load and initialize WASM Engine
  useEffect(() => {
    let active = true;

    async function loadPdfDocument() {
      if (!targetPdfUrl) {
        if (active) {
          setErrorMessage('No PDF file or sample link provided for this book.');
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        let arrayBuffer: ArrayBuffer;

        // Try direct fetch first
        try {
          const response = await fetch(targetPdfUrl, { mode: 'cors' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          arrayBuffer = await response.arrayBuffer();
        } catch {
          // If direct fetch fails (CORS or network), use server proxy route
          const proxyUrl = `/api/pdf?url=${encodeURIComponent(targetPdfUrl)}`;
          const proxyRes = await fetch(proxyUrl);
          if (!proxyRes.ok) throw new Error(`Proxy error ${proxyRes.status}`);
          arrayBuffer = await proxyRes.arrayBuffer();
        }

        if (!active) return;

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
        const total = doc.pageCount;
        setNumPages(total);
        setIsLoading(false);

        setupPages(total);
      } catch (err: any) {
        console.error('PDF Engine error:', err);
        if (active) {
          setErrorMessage(
            err?.message || 'Failed to load PDF file. Please verify the link or try again.'
          );
          setIsLoading(false);
        }
      }
    }

    loadPdfDocument();

    return () => {
      active = false;
      if (renderObserverRef.current) renderObserverRef.current.disconnect();
      if (activePageObserverRef.current) activePageObserverRef.current.disconnect();
      if (pdfDocRef.current) pdfDocRef.current[Symbol.dispose]();
      if (engineRef.current) engineRef.current.destroy();
    };
  }, [targetPdfUrl, setupPages]);

  // Touch and Trackpad Pinch-to-zoom
  useEffect(() => {
    const container = scrollViewRef.current;
    if (!container) return;

    let isPinching = false;
    let initialDist = 0;
    let startScale = scaleRef.current;
    let currentScale = scaleRef.current;
    let rafId: number | null = null;

    let viewportPinchX = 0;
    let viewportPinchY = 0;
    let originX = 0;
    let originY = 0;
    let initialScrollTop = 0;
    let initialScrollLeft = 0;

    const getDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const getCenter = (touches: TouchList) => ({
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    });

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching = true;
        initialDist = getDistance(e.touches);
        startScale = scaleRef.current;
        currentScale = startScale;

        const center = getCenter(e.touches);
        const scrollRect = container.getBoundingClientRect();
        viewportPinchX = center.x - scrollRect.left;
        viewportPinchY = center.y - scrollRect.top;

        initialScrollTop = container.scrollTop;
        initialScrollLeft = container.scrollLeft;

        if (canvasContainerRef.current) {
          const containerRect = canvasContainerRef.current.getBoundingClientRect();
          originX = center.x - containerRect.left;
          originY = center.y - containerRect.top;
        }

        setFitToWidth(false);
        fitToWidthRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches);
        if (initialDist < 10) return;

        const scaleRatio = dist / initialDist;
        const targetScale = Math.min(Math.max(startScale * scaleRatio, 0.5), 4.0);
        currentScale = targetScale;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          if (canvasContainerRef.current) {
            const relativeFactor = currentScale / scaleRef.current;
            canvasContainerRef.current.style.transformOrigin = `${originX}px ${originY}px`;
            canvasContainerRef.current.style.transform = `scale(${relativeFactor})`;
            canvasContainerRef.current.style.transition = 'none';
            canvasContainerRef.current.style.willChange = 'transform';
          }
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPinching && e.touches.length < 2) {
        isPinching = false;
        if (rafId) cancelAnimationFrame(rafId);

        if (canvasContainerRef.current) {
          canvasContainerRef.current.style.transform = '';
          canvasContainerRef.current.style.transformOrigin = '';
          canvasContainerRef.current.style.transition = '';
          canvasContainerRef.current.style.willChange = '';
        }

        const rawFinalScale = Math.min(Math.max(currentScale, 0.5), 4.0);
        const roundedScale = +rawFinalScale.toFixed(2);
        const scaleChangeRatio = roundedScale / scaleRef.current;

        if (Math.abs(scaleChangeRatio - 1) > 0.01) {
          const newScrollTop = (initialScrollTop + viewportPinchY) * scaleChangeRatio - viewportPinchY;
          const newScrollLeft = (initialScrollLeft + viewportPinchX) * scaleChangeRatio - viewportPinchX;

          setScale(roundedScale);
          scaleRef.current = roundedScale;
          applyZoom();

          container.scrollTop = Math.max(0, newScrollTop);
          container.scrollLeft = Math.max(0, newScrollLeft);
        }
      }
    };

    // Wheel pinch zoom
    let wheelTimer: NodeJS.Timeout | null = null;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setFitToWidth(false);
        fitToWidthRef.current = false;

        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const next = Math.min(Math.max(+(scaleRef.current + delta).toFixed(2), 0.5), 4.0);

        if (next !== scaleRef.current) {
          setScale(next);
          scaleRef.current = next;
          if (wheelTimer) clearTimeout(wheelTimer);
          wheelTimer = setTimeout(() => {
            applyZoom();
          }, 60);
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (wheelTimer) clearTimeout(wheelTimer);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [applyZoom]);

  // Window resize handler
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (fitToWidthRef.current && pdfDocRef.current) {
          applyZoom();
        }
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [applyZoom]);

  // Jump to specific page
  const scrollToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= numPages) {
      const targetWrapper = pageWrappersRef.current[pageNum - 1];
      if (targetWrapper) {
        targetWrapper.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Zoom buttons
  const handleZoomIn = () => {
    setFitToWidth(false);
    fitToWidthRef.current = false;
    setScale((prev) => {
      const next = +(prev + 0.25).toFixed(2);
      scaleRef.current = next;
      setTimeout(applyZoom, 0);
      return next;
    });
  };

  const handleZoomOut = () => {
    setFitToWidth(false);
    fitToWidthRef.current = false;
    setScale((prev) => {
      if (prev <= 0.5) return prev;
      const next = +(prev - 0.25).toFixed(2);
      scaleRef.current = next;
      setTimeout(applyZoom, 0);
      return next;
    });
  };

  const handleToggleFitWidth = () => {
    setFitToWidth((prev) => {
      const next = !prev;
      fitToWidthRef.current = next;
      if (next) {
        setScale(1.0);
        scaleRef.current = 1.0;
      }
      setTimeout(applyZoom, 0);
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isSampleLimited = mode === 'sample' && !isPurchased && numPages > maxSamplePages;
  const effectiveMaxPages = isSampleLimited ? maxSamplePages : numPages;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 w-screen h-screen bg-white text-slate-900 flex flex-col overflow-hidden select-none"
    >
      {/* 1. Header Toolbar */}
      <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer shrink-0"
            title="Back to book details"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Scrollable Canvas Stage */}
      <div className="relative w-full flex-1 overflow-hidden bg-white flex flex-col">
        {errorMessage ? (
          <div className="m-auto text-center p-6 max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">PDF Load Error</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{errorMessage}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Close Reader
            </button>
          </div>
        ) : (
          <div
            id="pdf-scroll-view"
            ref={scrollViewRef}
            className="h-full w-full overflow-y-auto overflow-x-auto p-2 sm:p-4"
          >
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#4029AB]" />
                <p className="text-xs font-bold text-slate-700">Initializing PDFium WASM Engine...</p>
                <p className="text-[11px] text-slate-500 max-w-xs text-center">
                  Loading high-precision vector rendering for crystal-clear readability.
                </p>
              </div>
            )}

            <div
              ref={canvasContainerRef}
              className="w-max min-w-full mx-auto flex flex-col items-center origin-top pb-24"
            />

            {/* Sample limit banner at the bottom of sample mode */}
            {isSampleLimited && !isLoading && (
              <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-3 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Sample Preview Finished</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You have viewed the {maxSamplePages}-page preview. Purchase the full e-book (₹{book.buy_price}) to unlock all {numPages || book.pages} pages with formulas, diagrams, and offline access.
                </p>
                {onBuyNow && (
                  <button
                    onClick={() => onBuyNow(book)}
                    className="w-full py-2.5 rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white font-bold text-xs shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Purchase Full eBook (₹{book.buy_price})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Floating Bottom Page Navigator */}
        {!errorMessage && !isLoading && numPages > 0 && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-full shadow-lg z-40 text-slate-700">
            <button
              disabled={currentPage <= 1}
              onClick={() => scrollToPage(currentPage - 1)}
              className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 text-xs font-semibold">
              <span className="text-slate-900 font-bold">{currentPage}</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-600">{effectiveMaxPages}</span>
            </div>

            <button
              disabled={currentPage >= effectiveMaxPages}
              onClick={() => scrollToPage(currentPage + 1)}
              className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
