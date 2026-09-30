'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  ListOrdered,
  X,
  Download,
  Loader2,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  BookOpen,
  Lock,
  ChevronRight,
  ChevronLeft,
  Hash,
  Eye,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { Book } from '@/lib/types';
import { resolveBookMdSampleUrl, resolveBookMdUrl } from '@/lib/services/storage';
import { getEpubOffline } from '@/lib/offline-storage';
import {
  preprocessMarkdownMath,
  splitMarkdownByH1,
  KATEX_SAFE_OPTIONS,
  MarkdownSection,
} from '@/lib/markdown-engine';

interface MarkdownReaderModalProps {
  book: Book;
  mode: 'sample' | 'full' | 'offline';
  onClose: () => void;
  onBuyNow?: (book: Book) => void;
  isPurchased?: boolean;
}

export const MarkdownReaderModal: React.FC<MarkdownReaderModalProps> = ({
  book,
  mode: initialMode,
  onClose,
  onBuyNow,
  isPurchased = false,
}) => {
  const [activeMode, setActiveMode] = useState<'sample' | 'full' | 'offline'>(initialMode);
  const [rawMarkdown, setRawMarkdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Feature 1: Font size increase/decrease (+/-) on top right
  const [fontSize, setFontSize] = useState<number>(16);

  // Feature 2: Table of Contents drawer & Sectional H1 Navigation
  const [isTocDrawerOpen, setIsTocDrawerOpen] = useState<boolean>(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);

  // Feature 3: Reading progress indicator (0 - 100%) based on viewport scroll
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const contentContainerRef = useRef<HTMLDivElement | null>(null);

  // Load Markdown file from Offline Storage, Remote, or Proxy
  useEffect(() => {
    let active = true;

    async function loadMarkdown() {
      // If user wants full edition but has not purchased, lock it
      if (activeMode === 'full' && !isPurchased) {
        setIsLoading(false);
        setErrorMessage(null);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Step 0: Check if offline ePub is already saved locally
        if (activeMode !== 'sample') {
          try {
            const offlineText = await getEpubOffline(book.id);
            if (offlineText && offlineText.trim().length > 0) {
              if (!active) return;
              setRawMarkdown(offlineText);
              setIsLoading(false);
              return;
            }
          } catch {}
        }

        let targetUrl = '';
        if (activeMode === 'sample') {
          targetUrl = resolveBookMdSampleUrl(
            book.mdsampleurl || book.mdSampleUrl || book.md_sample_url,
            book.id
          );
        } else {
          targetUrl = resolveBookMdUrl(
            book.mdurl || book.mdUrl || book.md_url || book.md_file,
            book.id
          );
        }

        let mdText = '';

        // Step 1: Direct fetch
        if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
          try {
            const res = await fetch(targetUrl, { mode: 'cors' });
            if (res.ok) {
              const text = await res.text();
              if (text && text.trim().length > 0) {
                mdText = text;
              }
            }
          } catch (fetchErr) {
            console.warn('Direct fetch failed, falling back to proxy:', fetchErr);
          }
        }

        // Step 2: Fallback to proxy route
        if (!mdText) {
          const proxyUrl = `/api/md?url=${encodeURIComponent(targetUrl || '')}&bookId=${encodeURIComponent(book.id || '')}`;
          const proxyRes = await fetch(proxyUrl);
          if (proxyRes.ok) {
            const text = await proxyRes.text();
            if (text && text.trim().length > 0) {
              mdText = text;
            }
          }
        }

        if (!active) return;

        if (mdText) {
          setRawMarkdown(mdText);
          setIsLoading(false);
        } else {
          throw new Error('Could not load markdown document content.');
        }
      } catch (err: any) {
        if (!active) return;
        console.error('Markdown loading error:', err);
        setErrorMessage(
          err?.message || 'Failed to load markdown content. Please verify internet connection.'
        );
        setIsLoading(false);
      }
    }

    loadMarkdown();

    return () => {
      active = false;
    };
  }, [book, activeMode, isPurchased]);

  // Sectional H1-wise breakdown to prevent DOM/scroll overload
  const sections: MarkdownSection[] = useMemo(() => {
    return splitMarkdownByH1(rawMarkdown);
  }, [rawMarkdown]);

  // Keep section index in valid range
  const safeSectionIndex = Math.min(Math.max(currentSectionIndex, 0), Math.max(sections.length - 1, 0));
  const activeSection = sections[safeSectionIndex] || sections[0];

  // Pre-process math ONLY for current active section (ultra-fast, zero DOM bloat)
  const processedSectionContent = useMemo(() => {
    if (!activeSection?.content) return '';
    return preprocessMarkdownMath(activeSection.content);
  }, [activeSection?.content]);

  // Track reading scroll progress inside the markdown viewport
  useEffect(() => {
    const el = contentContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) {
        setScrollProgress(0);
      } else {
        const pct = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
        setScrollProgress(pct);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [activeSection, isLoading, errorMessage, activeMode]);

  // Handle section selection
  const handleSelectSection = (index: number) => {
    setCurrentSectionIndex(index);
    setScrollProgress(0);
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (window.innerWidth < 768) {
      setIsTocDrawerOpen(false);
    }
  };

  const handleNextSection = () => {
    if (safeSectionIndex < sections.length - 1) {
      handleSelectSection(safeSectionIndex + 1);
    }
  };

  const handlePrevSection = () => {
    if (safeSectionIndex > 0) {
      handleSelectSection(safeSectionIndex - 1);
    }
  };

  // Font size handlers
  const handleIncreaseFont = () => {
    setFontSize((prev) => Math.min(prev + 2, 28));
  };

  const handleDecreaseFont = () => {
    setFontSize((prev) => Math.max(prev - 2, 12));
  };

  const handleResetFont = () => {
    setFontSize(16);
  };

  // Handle direct file download
  const handleDownload = () => {
    if (!rawMarkdown) return;
    setIsDownloading(true);
    try {
      const blob = new Blob([rawMarkdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanTitle = book.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${cleanTitle}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-2 md:p-4 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onCut={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDragStart={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'a', 'A', 'x', 'X', 'p', 'P', 's', 'S', 'u', 'U'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {/* Anti-copy protection & KaTeX pure black font color */}
      <style jsx global>{`
        .katex, .katex * {
          color: #000000 !important;
        }
        .markdown-body,
        .markdown-body * {
          color: #000000 !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }
        .markdown-body ::selection {
          background: transparent !important;
          color: inherit !important;
        }
        .markdown-body ::-moz-selection {
          background: transparent !important;
          color: inherit !important;
        }
      `}</style>

      <div
        className="w-full h-full sm:h-[95vh] sm:max-w-5xl bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-black border border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="md-reader-title"
      >
        {/* 1. Modal Top Bar Toolbar */}
        <header className="relative h-14 bg-white border-b border-gray-200 px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 gap-2">
          {/* Reading Progress Indicator Bar */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-100 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(scrollProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Reading progress"
          >
            <div
              className="h-full bg-[#1c0ca3] transition-[width] duration-150 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>

          {/* Left: Close button, TOC Toggle, Book Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-black transition-all cursor-pointer shrink-0"
              title="Close Reader"
              aria-label="Close Reader"
            >
              <ArrowLeft className="w-4 h-4 text-black" />
            </button>

            {/* Feature 2: TOC Toggle button */}
            <button
              id="modal-md-toc-toggle-btn"
              onClick={() => setIsTocDrawerOpen(!isTocDrawerOpen)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                isTocDrawerOpen
                  ? 'bg-[#1c0ca3] text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-black'
              }`}
              title="Table of Contents (# H1 Sections)"
            >
              <ListOrdered className="w-4 h-4" />
              <span className="hidden sm:inline">Chapters</span>
              {sections.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isTocDrawerOpen ? 'bg-white/20 text-white' : 'bg-gray-200 text-black'
                  }`}
                >
                  {sections.length}
                </span>
              )}
            </button>

            {/* Book Title & Section Metadata */}
            <div className="truncate min-w-0 ml-1">
              <h2 id="md-reader-title" className="text-xs sm:text-sm font-bold text-black truncate tracking-tight">
                <span className="sm:hidden">
                  {book.title.length > 12 ? `${book.title.slice(0, 12)}...` : book.title}
                </span>
                <span className="hidden sm:inline">
                  {book.title}
                </span>
              </h2>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-gray-600 font-semibold truncate">
                <span className="text-[#1c0ca3] font-bold shrink-0">
                  {activeMode === 'sample' ? 'Sample Preview' : 'Full eBook'}
                </span>
                <span className="text-gray-300">•</span>
                <span className="truncate">
                  Section {safeSectionIndex + 1} of {sections.length}: {activeSection?.title}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Just +/- Font Zoom Buttons and Close Button */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Font Zoom Controls: just +/- buttons (no pixel size text) */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
              <button
                id="modal-md-font-decrease-btn"
                onClick={handleDecreaseFont}
                disabled={fontSize <= 12}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-black hover:bg-white active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Decrease Font Size (-)"
                aria-label="Decrease Font Size"
              >
                <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />
              </button>

              <button
                id="modal-md-font-increase-btn"
                onClick={handleIncreaseFont}
                disabled={fontSize >= 28}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-black hover:bg-white active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Increase Font Size (+)"
                aria-label="Increase Font Size"
              >
                <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />
              </button>
            </div>

            {/* Close Modal (X) */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-black transition-all cursor-pointer shrink-0 ml-0.5"
              title="Close Modal"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </header>

        {/* 2. Reader Body with Drawer and Viewport */}
        <div className="relative w-full flex-1 overflow-hidden bg-white flex">
          {/* Table of Contents Drawer (# H1 only) */}
          <aside
            id="modal-md-toc-drawer"
            className={`absolute inset-y-0 left-0 z-40 w-72 sm:w-80 max-w-[85vw] bg-white border-r border-gray-200 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
              isTocDrawerOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            aria-label="Table of Contents"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1c0ca3]/10 text-[#1c0ca3] flex items-center justify-center">
                  <ListOrdered className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    Table of Contents
                  </h3>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {sections.length} {sections.length === 1 ? 'Section' : 'Sections'} (# H1 only)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTocDrawerOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-black transition-colors cursor-pointer"
                title="Close TOC drawer"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Drawer Chapters List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {sections.length === 0 ? (
                <div className="text-center py-10 px-4 text-gray-400 space-y-2">
                  <Hash className="w-8 h-8 mx-auto opacity-30 text-[#1c0ca3]" />
                  <p className="text-xs font-semibold text-gray-600">No sections found</p>
                </div>
              ) : (
                sections.map((section, idx) => {
                  const isActive = safeSectionIndex === idx;
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSelectSection(idx)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 group ${
                        isActive
                          ? 'bg-[#1c0ca3] text-white shadow-xs font-bold'
                          : 'text-black hover:bg-gray-100 font-medium'
                      }`}
                    >
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-black shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-black group-hover:bg-gray-200'
                        }`}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs leading-snug flex-1 break-words line-clamp-2">
                        {section.title}
                      </span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 transition-transform ${
                          isActive ? 'text-white translate-x-0.5' : 'text-gray-300 group-hover:text-black'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50/70 text-center">
              <span className="text-[10px] text-gray-600 font-semibold flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-[#1c0ca3]" />
                <span>KaTeX math engine &amp; multi-delimiter active</span>
              </span>
            </div>
          </aside>

          {/* Drawer Backdrop */}
          {isTocDrawerOpen && (
            <div
              onClick={() => setIsTocDrawerOpen(false)}
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-xs transition-opacity"
              aria-hidden="true"
            />
          )}

          {/* 3. Sectional Viewport */}
          <main
            ref={contentContainerRef}
            id="modal-markdown-viewport"
            className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 sm:p-8 md:p-10 bg-white"
          >
            {/* Locked Full Edition State (if not purchased) */}
            {activeMode === 'full' && !isPurchased && (
              <div className="m-auto text-center p-8 max-w-md bg-white rounded-3xl border border-gray-200 shadow-xl space-y-5 my-12">
                <div className="w-16 h-16 rounded-full bg-[#1c0ca3]/10 text-[#1c0ca3] flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-black">Full eBook Locked</h3>
                  <p className="text-xs text-gray-600 max-w-xs mx-auto">
                    Unlock complete chapters, offline access, and exam practice papers for only ₹{book.buy_price || book.list_price || 49}.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2.5">
                  {onBuyNow && (
                    <button
                      onClick={() => onBuyNow(book)}
                      className="w-full py-3 bg-[#1c0ca3] hover:bg-[#150980] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Buy Full Edition for ₹{book.buy_price || book.list_price || 49}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveMode('sample')}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-black rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Read Free Sample Preview</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[350px] gap-3 text-gray-600">
                <Loader2 className="w-8 h-8 animate-spin text-[#1c0ca3]" />
                <p className="text-xs font-bold text-black">Loading Markdown Section...</p>
                <p className="text-[11px] text-gray-500">
                  Parsing mathematical symbols and structuring chapters.
                </p>
              </div>
            )}

            {/* Error State */}
            {errorMessage && !isLoading && (
              <div className="m-auto text-center p-6 max-w-sm bg-white rounded-2xl border border-gray-200 shadow-xl space-y-3 mt-12">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-black">Failed to Load Content</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{errorMessage}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#1c0ca3] hover:bg-[#150980] text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Close
                </button>
              </div>
            )}

            {/* Sectional Markdown Render */}
            {!isLoading && !errorMessage && activeSection && (activeMode !== 'full' || isPurchased) && (
              <div className="max-w-3xl mx-auto pb-24">
                {/* Section Header Breadcrumb */}
                <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#1c0ca3] px-2 py-0.5 rounded">
                      Section {safeSectionIndex + 1} of {sections.length}
                    </span>
                    <span className="text-[11px] font-medium text-gray-500">
                      {activeSection.wordCount || 100} words
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsTocDrawerOpen(true)}
                      className="text-xs font-bold text-[#1c0ca3] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span>View Chapters</span>
                    </button>
                  </div>
                </div>

                {/* Markdown Body (Pure black font color & copy protected) */}
                <div
                  id="modal-markdown-body"
                  className="markdown-body select-none text-black antialiased font-normal"
                  onContextMenu={(e) => e.preventDefault()}
                  onCopy={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onCut={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  style={{
                    color: '#000000',
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.75,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  <Markdown
                    remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                    rehypePlugins={[[rehypeKatex, KATEX_SAFE_OPTIONS]]}
                    components={{
                      h1: ({ children, ...props }) => (
                        <h1
                          className="font-black text-black mt-8 mb-4 pb-2 border-b border-gray-200 tracking-tight"
                          style={{ fontSize: '1.65em', color: '#000000' }}
                          {...props}
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children, ...props }) => (
                        <h2
                          className="font-black text-black mt-7 mb-3 tracking-tight"
                          style={{ fontSize: '1.35em', color: '#000000' }}
                          {...props}
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children, ...props }) => (
                        <h3
                          className="font-bold text-black mt-5 mb-2"
                          style={{ fontSize: '1.15em', color: '#000000' }}
                          {...props}
                        >
                          {children}
                        </h3>
                      ),
                      h4: ({ children, ...props }) => (
                        <h4
                          className="font-bold text-black mt-4 mb-1.5"
                          style={{ fontSize: '1.05em', color: '#000000' }}
                          {...props}
                        >
                          {children}
                        </h4>
                      ),
                      p: ({ children, ...props }) => (
                        <p
                          className="mb-4 leading-relaxed text-black font-normal last:mb-0"
                          style={{ color: '#000000' }}
                          {...props}
                        >
                          {children}
                        </p>
                      ),
                      ul: ({ children, ...props }) => (
                        <ul className="list-disc pl-6 space-y-1.5 my-4 text-black" style={{ color: '#000000' }} {...props}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children, ...props }) => (
                        <ol className="list-decimal pl-6 space-y-1.5 my-4 text-black" style={{ color: '#000000' }} {...props}>
                          {children}
                        </ol>
                      ),
                      li: ({ children, ...props }) => (
                        <li className="leading-relaxed text-black" style={{ color: '#000000' }} {...props}>
                          {children}
                        </li>
                      ),
                      blockquote: ({ children, ...props }) => (
                        <blockquote
                          className="border-l-4 border-[#1c0ca3] pl-4 py-1.5 my-5 italic text-black bg-gray-50 rounded-r-xl"
                          style={{ color: '#000000' }}
                          {...props}
                        >
                          {children}
                        </blockquote>
                      ),
                      code: ({ inline, className, children, ...props }: any) => {
                        if (inline) {
                          return (
                            <code
                              className="bg-gray-100 text-black px-1.5 py-0.5 rounded font-mono text-[0.9em] border border-gray-200"
                              style={{ color: '#000000' }}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }
                        return (
                          <pre className="bg-gray-950 text-white p-4 rounded-xl overflow-x-auto my-4 text-xs font-mono leading-relaxed shadow-sm">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        );
                      },
                      table: ({ children, ...props }) => (
                        <div className="overflow-x-auto my-5 rounded-xl border border-gray-200">
                          <table className="w-full text-left text-xs border-collapse text-black" style={{ color: '#000000' }} {...props}>
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children, ...props }) => (
                        <th className="bg-gray-100 p-2.5 font-bold border-b border-gray-200 text-black" style={{ color: '#000000' }} {...props}>
                          {children}
                        </th>
                      ),
                      td: ({ children, ...props }) => (
                        <td className="p-2.5 border-b border-gray-100 text-black" style={{ color: '#000000' }} {...props}>
                          {children}
                        </td>
                      ),
                      strong: ({ children, ...props }) => (
                        <strong className="font-black text-black" style={{ color: '#000000' }} {...props}>
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {processedSectionContent}
                  </Markdown>
                </div>

                {/* Bottom Section Pager Navigation */}
                <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {safeSectionIndex > 0 ? (
                    <button
                      onClick={handlePrevSection}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 hover:border-[#1c0ca3] text-black hover:text-[#1c0ca3] bg-white transition-all cursor-pointer flex items-center justify-center gap-2 group text-xs font-bold shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4 text-black group-hover:text-[#1c0ca3] transition-colors" />
                      <div className="text-left">
                        <span className="block text-[10px] text-gray-500 font-normal">Previous Chapter</span>
                        <span className="truncate max-w-[180px] block">
                          {sections[safeSectionIndex - 1]?.title}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="hidden sm:block" />
                  )}

                  <div className="text-center">
                    <span className="text-xs font-bold text-black block">
                      Chapter {safeSectionIndex + 1} of {sections.length}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {Math.round(((safeSectionIndex + 1) / sections.length) * 100)}% complete
                    </span>
                  </div>

                  {safeSectionIndex < sections.length - 1 ? (
                    <button
                      onClick={handleNextSection}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1c0ca3] hover:bg-[#150980] text-white transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold shadow-xs active:scale-95"
                    >
                      <div className="text-right">
                        <span className="block text-[10px] text-white/80 font-normal">Next Chapter</span>
                        <span className="truncate max-w-[180px] block">
                          {sections[safeSectionIndex + 1]?.title}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                  ) : (
                    <button
                      onClick={onClose}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Done Reading
                    </button>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
