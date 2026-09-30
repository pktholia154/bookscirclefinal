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
import { extractH1Headings, TocHeading } from './MarkdownReader';

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
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Feature 1: Font size increase/decrease (+/-) on top right
  const [fontSize, setFontSize] = useState<number>(16);

  // Feature 2: Table of Contents drawer for # h1 only
  const [isTocDrawerOpen, setIsTocDrawerOpen] = useState<boolean>(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentContainerRef = useRef<HTMLDivElement | null>(null);

  // Extract only # h1 headings
  const tocHeadings = useMemo(() => {
    return extractH1Headings(markdownContent);
  }, [markdownContent]);

  // Map for matching rendered H1s with TOC IDs
  const headingIdMap = useMemo(() => {
    const map = new Map<string, string>();
    const seen = new Map<string, number>();
    tocHeadings.forEach((h) => {
      const key = h.text.trim();
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      map.set(`${key}__${count}`, h.id);
    });
    return map;
  }, [tocHeadings]);

  // Load Markdown file from Storage or Proxy
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
              setMarkdownContent(offlineText);
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
          setMarkdownContent(mdText);
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

  // Scroll spy for active H1 heading
  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container || tocHeadings.length === 0) return;

    const handleScroll = () => {
      const scrollPos = container.scrollTop + 140;
      let currentId = '';

      for (let i = 0; i < tocHeadings.length; i++) {
        const headingEl = document.getElementById(tocHeadings[i].id);
        if (headingEl) {
          const top = headingEl.offsetTop;
          if (top <= scrollPos) {
            currentId = tocHeadings[i].id;
          } else {
            break;
          }
        }
      }

      if (currentId && currentId !== activeHeadingId) {
        setActiveHeadingId(currentId);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [tocHeadings, activeHeadingId]);

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

  // Scroll to H1 heading
  const scrollToHeading = (headingId: string) => {
    const el = document.getElementById(headingId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeadingId(headingId);
      if (window.innerWidth < 768) {
        setIsTocDrawerOpen(false);
      }
    }
  };

  // Download markdown file
  const handleDownload = () => {
    if (!markdownContent) return;
    setIsDownloading(true);
    try {
      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const cleanTitle = (book.title || 'ebook').replace(/[^a-zA-Z0-9_-]/g, '_');
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${cleanTitle}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  // Unpurchased Full Book Lock View
  if (activeMode === 'full' && !isPurchased) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 w-screen h-screen bg-white text-slate-900 flex flex-col justify-between overflow-hidden select-none"
      >
        <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{book.title}</h2>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4029AB] bg-[#4029AB]/10 px-2 py-0.5 rounded">
              Paid Digital Edition (.md)
            </span>
            <h3 className="text-lg font-black text-slate-950">Full Markdown Edition Protected</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              The complete syllabus markdown edition is reserved for verified purchasers. Instant delivery upon purchase.
            </p>
          </div>

          <div className="w-full space-y-2.5 pt-2">
            {onBuyNow && (
              <button
                onClick={() => onBuyNow(book)}
                className="w-full py-3 px-4 rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Instant Buy Now (₹{book.buy_price})</span>
              </button>
            )}
            <button
              onClick={() => setActiveMode('sample')}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4 text-[#4029AB]" />
              <span>Read Free Sample Preview (.md)</span>
            </button>
          </div>
        </div>

        <footer className="p-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure Razorpay Gateway &amp; Lifetime Cloud Delivery</span>
          </p>
        </footer>
      </div>
    );
  }

  // Internal render counter for duplicate H1 texts
  const renderedH1Counter = new Map<string, number>();

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 w-screen h-screen bg-white text-slate-900 flex flex-col overflow-hidden select-none"
    >
      {/* 1. Header Toolbar: Minimalist, only TOC menu and +/- controls */}
      <header className="h-12 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 w-full">
        {/* Left: Back button & TOC Drawer Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer shrink-0"
            title="Back to book details"
            aria-label="Back to book details"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Feature: TOC Drawer Toggle button */}
          <button
            id="modal-md-toc-drawer-toggle-btn"
            onClick={() => setIsTocDrawerOpen(!isTocDrawerOpen)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isTocDrawerOpen
                ? 'bg-[#4029AB] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
            title="Table of Contents (Headings # H1)"
            aria-label="Table of Contents"
          >
            <ListOrdered className="w-4 h-4" />
            <span>TOC</span>
            {tocHeadings.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isTocDrawerOpen ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tocHeadings.length}
              </span>
            )}
          </button>
        </div>

        {/* Right: Font size increase/decrease (+/-) buttons */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          {/* Decrease font (-) */}
          <button
            id="modal-md-font-decrease-btn"
            onClick={handleDecreaseFont}
            disabled={fontSize <= 12}
            className="w-8 h-8 rounded-md flex items-center justify-center text-slate-700 hover:bg-white active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer font-bold text-base"
            title="Decrease Font Size (-)"
            aria-label="Decrease Font Size"
          >
            -
          </button>

          {/* Current Font Indicator */}
          <button
            onClick={handleResetFont}
            className="px-2 py-0.5 text-xs font-bold text-slate-700 hover:text-[#4029AB] transition-colors cursor-pointer min-w-[42px] text-center"
            title="Reset font to 16px"
          >
            {fontSize}px
          </button>

          {/* Increase font (+) */}
          <button
            id="modal-md-font-increase-btn"
            onClick={handleIncreaseFont}
            disabled={fontSize >= 28}
            className="w-8 h-8 rounded-md flex items-center justify-center text-slate-700 hover:bg-white active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer font-bold text-base"
            title="Increase Font Size (+)"
            aria-label="Increase Font Size"
          >
            +
          </button>
        </div>
      </header>

      {/* 2. Main Area with Left Drawer and Content Stage */}
      <div className="relative w-full flex-1 overflow-hidden bg-white flex">
        {/* Feature 2: Table of Contents Left Drawer */}
        <aside
          id="modal-md-toc-drawer"
          className={`absolute inset-y-0 left-0 z-40 w-72 sm:w-80 max-w-[85vw] bg-white border-r border-slate-200 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
            isTocDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Table of Contents Drawer"
        >
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center">
                <ListOrdered className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Table of Contents
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {tocHeadings.length} {tocHeadings.length === 1 ? 'Chapter' : 'Chapters'} (# H1 only)
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsTocDrawerOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Close TOC drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Headings List (Only # h1 headings) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {tocHeadings.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-400 space-y-2">
                <Hash className="w-8 h-8 mx-auto opacity-30 text-[#4029AB]" />
                <p className="text-xs font-semibold text-slate-600">No H1 headings found</p>
                <p className="text-[11px] text-slate-400">
                  This document has no primary <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]"># Heading</code> lines.
                </p>
              </div>
            ) : (
              tocHeadings.map((heading) => {
                const isActive = activeHeadingId === heading.id;
                return (
                  <button
                    key={heading.id}
                    onClick={() => scrollToHeading(heading.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 group ${
                      isActive
                        ? 'bg-[#4029AB] text-white shadow-xs font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-medium'
                    }`}
                  >
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-black shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}
                    >
                      {String(heading.index).padStart(2, '0')}
                    </span>
                    <span className="text-xs leading-snug flex-1 break-words line-clamp-2">
                      {heading.text}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 transition-transform ${
                        isActive ? 'text-white translate-x-0.5' : 'text-slate-300 group-hover:text-slate-500'
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
            <span className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-[#4029AB]" />
              <span>Full KaTeX mathematical rendering active</span>
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

        {/* 3. Main Markdown Document Viewport */}
        <div
          ref={contentContainerRef}
          id="modal-markdown-viewport"
          className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 sm:p-8 md:p-12 bg-white"
        >
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#4029AB]" />
              <p className="text-xs font-bold text-slate-700">Loading Markdown Edition...</p>
              <p className="text-[11px] text-slate-400">
                Parsing LaTeX formulas and compiling headings.
              </p>
            </div>
          )}

          {/* Error */}
          {errorMessage && !isLoading && (
            <div className="m-auto text-center p-6 max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl space-y-3 mt-12">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Failed to Load Document</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{errorMessage}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          )}

          {/* Markdown Content */}
          {!isLoading && !errorMessage && markdownContent && (
            <div className="max-w-3xl mx-auto pb-28">
              {/* Header Title */}
              <div className="mb-8 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4029AB] bg-[#4029AB]/10 px-2 py-0.5 rounded">
                    Markdown Format
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {tocHeadings.length} {tocHeadings.length === 1 ? 'Primary Section' : 'Primary Sections'}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                  {book.title}
                </h1>
                {book.author && (
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    By {book.author} • {book.publisher || 'BooksCircle Digital Edition'}
                  </p>
                )}
              </div>

              {/* Dynamic Styled Markdown Body */}
              <div
                id="modal-markdown-body"
                className="markdown-body select-text text-slate-800 antialiased"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.7,
                }}
              >
                <Markdown
                  remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    // Feature 2: Heading 1 assignment with anchor ID and TOC linkage
                    h1: ({ children, ...props }) => {
                      const text = String(children || '').trim();
                      const currentCount = renderedH1Counter.get(text) || 0;
                      renderedH1Counter.set(text, currentCount + 1);
                      const assignedId = headingIdMap.get(`${text}__${currentCount}`) || `h1-${currentCount}`;

                      return (
                        <h1
                          id={assignedId}
                          tabIndex={-1}
                          className="scroll-mt-20 font-black text-slate-950 mt-10 mb-4 pb-2.5 border-b border-slate-200/80 flex items-baseline gap-2 group tracking-tight"
                          style={{ fontSize: '1.65em' }}
                          {...props}
                        >
                          <span className="text-[#4029AB] font-bold text-xs select-none opacity-30 group-hover:opacity-100 transition-opacity">
                            #
                          </span>
                          <span>{children}</span>
                        </h1>
                      );
                    },
                    h2: ({ children, ...props }) => (
                      <h2
                        className="font-black text-slate-900 mt-8 mb-3 scroll-mt-20 tracking-tight"
                        style={{ fontSize: '1.35em' }}
                        {...props}
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({ children, ...props }) => (
                      <h3
                        className="font-bold text-slate-900 mt-6 mb-2 scroll-mt-20"
                        style={{ fontSize: '1.15em' }}
                        {...props}
                      >
                        {children}
                      </h3>
                    ),
                    p: ({ children, ...props }) => (
                      <p className="mb-4 leading-relaxed text-slate-700 last:mb-0" {...props}>
                        {children}
                      </p>
                    ),
                    ul: ({ children, ...props }) => (
                      <ul className="list-disc pl-6 space-y-1.5 my-4 text-slate-700" {...props}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children, ...props }) => (
                      <ol className="list-decimal pl-6 space-y-1.5 my-4 text-slate-700" {...props}>
                        {children}
                      </ol>
                    ),
                    li: ({ children, ...props }) => (
                      <li className="leading-relaxed" {...props}>
                        {children}
                      </li>
                    ),
                    blockquote: ({ children, ...props }) => (
                      <blockquote
                        className="border-l-4 border-[#4029AB] pl-4 py-1 my-5 italic text-slate-600 bg-slate-50/70 rounded-r-xl"
                        {...props}
                      >
                        {children}
                      </blockquote>
                    ),
                    code: ({ inline, className, children, ...props }: any) => {
                      if (inline) {
                        return (
                          <code
                            className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono text-[0.9em] border border-slate-200/60"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                      return (
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto my-4 text-xs font-mono leading-relaxed shadow-sm">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      );
                    },
                    hr: () => <hr className="my-8 border-slate-200" />,
                    table: ({ children, ...props }) => (
                      <div className="overflow-x-auto my-6 border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse" {...props}>
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children, ...props }) => (
                      <th className="p-3 bg-slate-100 font-bold text-slate-900 border-b border-slate-200" {...props}>
                        {children}
                      </th>
                    ),
                    td: ({ children, ...props }) => (
                      <td className="p-3 border-b border-slate-100 text-slate-700" {...props}>
                        {children}
                      </td>
                    ),
                    a: ({ href, children, ...props }) => (
                      <a
                        href={href}
                        className="text-[#4029AB] font-semibold underline underline-offset-2 hover:text-[#34208e]"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {markdownContent}
                </Markdown>
              </div>

              {/* End of sample preview CTA */}
              {activeMode === 'sample' && !isPurchased && (
                <div className="my-12 p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-xl">
                  <div className="w-12 h-12 rounded-2xl bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-slate-950">
                      End of Sample Markdown Edition
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                      You have reached the end of the public preview sample. Unlock the complete verified ebook with all chapters, worked solutions, and printable offline editions.
                    </p>
                  </div>
                  {onBuyNow && (
                    <button
                      onClick={() => onBuyNow(book)}
                      className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Purchase Complete Edition (₹{book.buy_price})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Navigator */}
      {!isLoading && !errorMessage && tocHeadings.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-1.5 rounded-full shadow-lg z-30 text-slate-700">
          <button
            onClick={() => setIsTocDrawerOpen(!isTocDrawerOpen)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-[#4029AB] transition-colors cursor-pointer"
          >
            <ListOrdered className="w-3.5 h-3.5 text-[#4029AB]" />
            <span>TOC ({tocHeadings.length} Headings)</span>
          </button>
          <span className="text-slate-300">•</span>
          <span className="text-xs text-slate-500 font-semibold">
            Font: {fontSize}px
          </span>
        </div>
      )}
    </div>
  );
};
