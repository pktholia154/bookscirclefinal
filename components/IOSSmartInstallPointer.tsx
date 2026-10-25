'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Share,
  PlusSquare,
  ArrowUp,
  ArrowDown,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Copy,
  Check,
  Compass,
  MoreHorizontal,
  Menu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  usePWAInstall,
  IOSPointerPosition,
} from '@/hooks/use-pwa-install';

export const IOSSmartInstallPointer: React.FC = () => {
  const {
    shouldShowIOSSmartPointer,
    environment,
    viewport,
    iosPointerPosition,
    iosPointerMinimized,
    setIOSPointerPosition,
    cycleIOSPointerPosition,
    toggleIOSPointerMinimized,
    dismissIOSPointer,
  } = usePWAInstall();

  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!shouldShowIOSSmartPointer) {
    return null;
  }

  const isTopAnchor =
    iosPointerPosition === 'top-right' || iosPointerPosition === 'top-left';
  const isCompact = viewport.isCompactHeight || viewport.orientation === 'landscape';

  const handleCopyUrl = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {}
  };

  // Browser-specific instruction copy & step labels
  const getBrowserConfig = () => {
    if (environment.isInAppWebView) {
      return {
        badge: 'In-App Browser',
        targetLabel: 'Tap ••• or Safari icon to open in Safari',
        step1Label: 'Open in Safari',
        step2Label: 'Tap Share',
        step3Label: 'Add to Home Screen',
        hint: 'In-app browsers block direct Home Screen installation.',
      };
    }

    if (environment.isIOSLegacyNonSafari) {
      return {
        badge: `${environment.browserName} (iOS ${environment.iosMajorVersion || '<16'})`,
        targetLabel: 'Open in Safari to Add to Home Screen',
        step1Label: 'Open in Safari',
        step2Label: 'Tap Share',
        step3Label: 'Add to Home Screen',
        hint: 'On older iOS versions, only Safari supports Home Screen web apps.',
      };
    }

    switch (environment.iosBrowser) {
      case 'chrome':
        return {
          badge: 'Chrome for iOS',
          targetLabel:
            iosPointerPosition === 'top-right'
              ? 'Tap the Share icon in the top address bar'
              : 'Tap the Share icon in Chrome toolbar',
          step1Label: 'Share',
          step2Label: 'Add to Home Screen',
          step3Label: 'Add',
          hint: 'Pointing to Chrome Share control near the address bar',
        };
      case 'safari':
        return {
          badge: environment.isIPad ? 'Safari · iPadOS' : 'Safari · iOS',
          targetLabel:
            iosPointerPosition === 'bottom-center'
              ? 'Tap Share in Safari bottom toolbar'
              : iosPointerPosition === 'top-left'
              ? 'Tap Page Menu / Share in top address bar'
              : 'Tap Share in Safari top toolbar',
          step1Label: 'Share',
          step2Label: 'Add to Home Screen',
          step3Label: 'Add',
          hint:
            viewport.orientation === 'landscape'
              ? 'Landscape toolbar detected'
              : 'Adaptive Safari toolbar pointer',
        };
      case 'edge':
        return {
          badge: 'Edge for iOS',
          targetLabel: 'Tap ••• or Share in the bottom toolbar',
          step1Label: 'Menu / Share',
          step2Label: 'Add to Home Screen',
          step3Label: 'Add',
          hint: 'Pointing to Edge toolbar controls',
        };
      case 'firefox':
        return {
          badge: 'Firefox for iOS',
          targetLabel: 'Tap ≡ menu then Share in toolbar',
          step1Label: 'Menu → Share',
          step2Label: 'Add to Home Screen',
          step3Label: 'Add',
          hint: 'Pointing to Firefox menu controls',
        };
      default:
        return {
          badge: environment.browserName || 'iOS Browser',
          targetLabel: 'Tap Share in your browser toolbar',
          step1Label: 'Share',
          step2Label: 'Add to Home Screen',
          step3Label: 'Add',
          hint: 'Use native browser Share menu to add icon',
        };
    }
  };

  const config = getBrowserConfig();

  // Compute container positioning classes based on active anchor
  const getAnchorContainerClasses = (): string => {
    switch (iosPointerPosition) {
      case 'top-right':
        return 'top-2 right-2.5 sm:right-4 items-end';
      case 'top-left':
        return 'top-2 left-2.5 sm:left-4 items-start';
      case 'bottom-right':
        return 'bottom-2.5 right-2.5 sm:right-4 items-end';
      case 'bottom-center':
      default:
        return 'bottom-2.5 left-1/2 -translate-x-1/2 items-center';
    }
  };

  // Compute arrow horizontal alignment so it points at the exact native toolbar icon
  const getArrowAlignmentClasses = (): string => {
    switch (iosPointerPosition) {
      case 'top-right':
        // In Chrome iOS, Share icon sits just left of the tab switcher / omnibox right edge (~44px from right)
        return environment.iosBrowser === 'chrome' ? 'mr-10' : 'mr-6';
      case 'top-left':
        return 'ml-6';
      case 'bottom-right':
        return 'mr-5';
      case 'bottom-center':
      default:
        return 'mx-auto';
    }
  };

  const positionOptions: Array<{ id: IOSPointerPosition; label: string }> = [
    { id: 'bottom-center', label: 'Bottom Bar' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'bottom-right', label: 'Bottom Right' },
    { id: 'top-left', label: 'Top Left' },
  ];

  // Minimized pill view (non-Android, lightweight iOS floating indicator)
  if (iosPointerMinimized) {
    return (
      <div
        id="ios-smart-install-pointer-minimized"
        className={`fixed z-50 flex flex-col pointer-events-none select-none ${getAnchorContainerClasses()}`}
      >
        <div className="pointer-events-auto flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-full bg-gray-950/95 text-white shadow-lg border border-white/15 backdrop-blur-md">
          <button
            type="button"
            onClick={toggleIOSPointerMinimized}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white cursor-pointer"
          >
            <Share className="w-3.5 h-3.5 text-[#a78bfa] shrink-0" />
            <span className="whitespace-nowrap">Add to Home Screen</span>
            {isTopAnchor ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
          <button
            type="button"
            onClick={dismissIOSPointer}
            aria-label="Dismiss Home Screen pointer"
            className="w-5 h-5 rounded-full hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.aside
        id="ios-smart-install-pointer"
        role="region"
        aria-label="iOS Home Screen Installation Pointer"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`fixed z-50 flex flex-col pointer-events-none select-none w-[calc(100vw-20px)] max-w-[356px] ${getAnchorContainerClasses()}`}
      >
        {/* TOP ANIMATED POINTER ARROW (Rendered when pointing to Top Address Bar / Top Toolbar) */}
        {isTopAnchor && (
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            className={`flex flex-col items-center mb-1 pointer-events-none ${getArrowAlignmentClasses()}`}
          >
            <div className="w-6 h-6 rounded-full bg-[#4029AB] text-white shadow-md flex items-center justify-center ring-2 ring-white">
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.75]" />
            </div>
            <div className="w-2.5 h-2.5 bg-gray-950 rotate-45 -mt-1 border-l border-t border-white/15" />
          </motion.div>
        )}

        {/* SMART POINTER CARD (Lightweight, non-modal, high-contrast dark surface) */}
        <div className="pointer-events-auto w-full rounded-2xl bg-gray-950/95 text-white shadow-2xl border border-white/15 backdrop-blur-md overflow-hidden">
          {/* Row 1: App Icon + Target Directive + Position Correction & Minimize/Close */}
          <div className={`px-3 ${isCompact ? 'py-2' : 'pt-2.5 pb-2'} flex items-center justify-between gap-2`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-white/20">
                <Image
                  src="/apple-touch-icon.png"
                  alt="BooksCircle"
                  fill
                  sizes="32px"
                  referrerPolicy="no-referrer"
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-300 font-medium leading-none">
                  <span className="truncate">{config.badge}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setShowPositionPicker((prev) => !prev)}
                    className="text-[#c4b5fd] hover:text-white underline underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0"
                    title="Adjust pointer position if your browser toolbar is at a different edge"
                  >
                    <SlidersHorizontal className="w-2.5 h-2.5" />
                    <span>Move Pointer</span>
                  </button>
                </div>
                <p className="text-xs font-bold text-white truncate mt-1">
                  {config.targetLabel}
                </p>
              </div>
            </div>

            {/* Right Controls: Minimize & Dismiss */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleIOSPointerMinimized}
                aria-label="Minimize pointer"
                title="Minimize"
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                {isTopAnchor ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={dismissIOSPointer}
                aria-label="Close installation pointer"
                title="Dismiss"
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Optional Manual Positioning Correction Bar (Toolbar at Top vs Bottom) */}
          {showPositionPicker && (
            <div className="px-3 py-2 bg-white/5 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-gray-300">
                <span>Where is your browser Share / menu bar?</span>
                <button
                  type="button"
                  onClick={cycleIOSPointerPosition}
                  className="text-[#c4b5fd] font-semibold hover:underline cursor-pointer"
                >
                  Cycle ↻
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {positionOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setIOSPointerPosition(opt.id);
                      setShowPositionPicker(false);
                    }}
                    className={`py-1 px-1.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap truncate ${
                      iosPointerPosition === opt.id
                        ? 'bg-[#4029AB] text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row 2: Visual 3-Step Flow: Share -> Add to Home Screen -> Add */}
          {environment.isInAppWebView || environment.isIOSLegacyNonSafari ? (
            <div className="px-3 pb-2.5 pt-1 border-t border-white/10 flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-300 truncate">
                {config.hint}
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-2.5 py-1 rounded-lg bg-[#4029AB] hover:bg-[#34208e] text-white text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Safari Link</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="px-3 py-2 bg-white/[0.04] border-t border-white/10 flex items-center justify-between gap-1 text-[11px]">
              {/* Step 1: Share */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-[#4029AB] text-white flex items-center justify-center shrink-0">
                  {environment.iosBrowser === 'edge' ? (
                    <MoreHorizontal className="w-3 h-3" />
                  ) : environment.iosBrowser === 'firefox' ? (
                    <Menu className="w-3 h-3" />
                  ) : (
                    <Share className="w-3 h-3" />
                  )}
                </span>
                <span className="font-semibold text-white whitespace-nowrap">
                  1. {config.step1Label}
                </span>
              </div>

              <span className="text-gray-500 font-bold" aria-hidden="true">
                →
              </span>

              {/* Step 2: Add to Home Screen */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-white/15 text-white flex items-center justify-center shrink-0">
                  <PlusSquare className="w-3 h-3" />
                </span>
                <span className="font-semibold text-white whitespace-nowrap truncate">
                  2. {config.step2Label}
                </span>
              </div>

              <span className="text-gray-500 font-bold" aria-hidden="true">
                →
              </span>

              {/* Step 3: Add */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="px-1.5 py-0.5 rounded bg-white/15 text-[#c4b5fd] font-bold text-[10px] whitespace-nowrap">
                  3. {config.step3Label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ANIMATED POINTER ARROW (Rendered when pointing to Bottom Toolbar) */}
        {!isTopAnchor && (
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            className={`flex flex-col items-center mt-1 pointer-events-none ${getArrowAlignmentClasses()}`}
          >
            <div className="w-2.5 h-2.5 bg-gray-950 rotate-45 -mb-1 border-r border-b border-white/15" />
            <div className="w-6 h-6 rounded-full bg-[#4029AB] text-white shadow-md flex items-center justify-center ring-2 ring-white">
              <ArrowDown className="w-3.5 h-3.5 stroke-[2.75]" />
            </div>
          </motion.div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
};
