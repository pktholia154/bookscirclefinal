'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  Share2,
  PlusSquare,
  Smartphone,
  Monitor,
  MoreVertical,
  Download,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Compass,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall, forceHardFlushAndReloadApp } from '@/hooks/use-pwa-install';

interface IOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'ios' | 'android' | 'desktop' | 'macos-safari' | 'webview';

export const IOSInstallGuideModal: React.FC<IOSInstallGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    platform,
    environment,
    isIOSPromptOpen,
    closeIOSPrompt,
  } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<GuideTab>('ios');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [shareAttempted, setShareAttempted] = useState(false);

  useEffect(() => {
    if (environment.isInAppWebView) {
      setActiveTab('webview');
    } else if (environment.isMacOSSafari) {
      setActiveTab('macos-safari');
    } else if (platform === 'android') {
      setActiveTab('android');
    } else if (platform === 'ios') {
      setActiveTab('ios');
    } else {
      setActiveTab('desktop');
    }
  }, [platform, environment.isInAppWebView, environment.isMacOSSafari]);

  const shouldShow = isOpen || isIOSPromptOpen;
  if (!shouldShow) return null;

  const handleClose = () => {
    onClose();
    closeIOSPrompt();
  };

  const handleCopyUrl = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {}
  };

  /**
   * Invokes native iOS Share Sheet via Web Share API when clicked.
   * On iOS Safari and Chrome on iOS, navigator.share() directly triggers
   * the native Action Sheet where "Add to Home Screen" is immediately accessible.
   */
  const handleTriggerNativeShare = async () => {
    if (typeof window === 'undefined') return;
    setShareAttempted(true);

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'BooksCircle App',
          text: 'Install BooksCircle App on your Home Screen',
          url: window.location.href,
        });
        return;
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error?.name !== 'AbortError') {
          // If native share fails or is blocked, copy URL as fallback
          await handleCopyUrl();
        }
      }
    } else {
      await handleCopyUrl();
    }
  };

  /**
   * Hard flush all previous installation cache and force-reload latest build
   */
  const handleFlushCache = async () => {
    if (isFlushing) return;
    setIsFlushing(true);
    await forceHardFlushAndReloadApp();
  };

  const isChromeIOS = environment.isIOSChrome;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
        {/* Backdrop click to dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-gray-100 z-10 space-y-3.5 max-h-[92vh] overflow-y-auto"
        >
          {/* Header & Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-xs shrink-0 border border-gray-100">
                <Image
                  src="/apple-touch-icon.png"
                  alt="BooksCircle App Icon"
                  fill
                  referrerPolicy="no-referrer"
                  className="object-contain rounded-xl"
                />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-950 flex items-center gap-1.5">
                  <span>Install BooksCircle</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#4029AB]/10 text-[#4029AB]">
                    v17.0 Live
                  </span>
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {environment.browserName} • Standalone Web App
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close guide"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Platform Switcher Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white text-[#4029AB] shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-3 h-3 shrink-0" />
              <span>iOS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-white text-[#4029AB] shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-3 h-3 shrink-0" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('macos-safari')}
              className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'macos-safari'
                  ? 'bg-white text-[#4029AB] shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Monitor className="w-3 h-3 shrink-0" />
              <span>macOS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'desktop'
                  ? 'bg-white text-[#4029AB] shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Monitor className="w-3 h-3 shrink-0" />
              <span>PC / Web</span>
            </button>
          </div>

          {/* 1. In-App WebView Breakout Warning */}
          {activeTab === 'webview' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    Tap the top-right Menu (•••) <ExternalLink className="w-3.5 h-3.5 text-[#4029AB]" />
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    In-app browsers (Instagram, LinkedIn, Facebook, WhatsApp) block direct home screen installation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900">
                    Select &quot;Open in System Browser&quot; (Chrome or Safari)
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Or copy the link below and paste it into Safari or Chrome to install the standalone app.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyUrl}
                className="w-full py-2.5 px-3 rounded-xl border border-[#4029AB]/25 bg-[#4029AB]/5 text-[#4029AB] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Link Copied! Paste in Safari/Chrome' : 'Copy Link for System Browser'}</span>
              </button>
            </div>
          )}

          {/* 2. iOS / iPadOS Instructions with Active Share Menu CTA */}
          {activeTab === 'ios' && (
            <div className="space-y-2.5 pt-1">
              {/* PRIMARY ACTION: Tap to open native iOS Share Menu */}
              <div className="p-3 rounded-2xl bg-[#4029AB]/5 border border-[#4029AB]/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#4029AB] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#4029AB]" />
                    Quick 1-Tap Action
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {isChromeIOS ? 'Chrome on iOS' : 'Safari on iOS'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerNativeShare}
                  className="w-full py-3 px-4 rounded-xl bg-[#4029AB] hover:bg-[#34208e] active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-white" />
                  <span>Tap to Open iOS Share Menu</span>
                </button>
                <p className="text-[11px] text-gray-600 text-center font-medium">
                  Tapping above opens the system menu directly. Then tap <strong>Add to Home Screen</strong>.
                </p>
              </div>

              {/* Step-by-Step tailored to Chrome on iOS vs Safari */}
              {isChromeIOS ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-gray-900 flex items-center gap-1.5">
                        In Chrome: Tap the Share Icon <Share2 className="w-3.5 h-3.5 text-[#4029AB]" />
                      </p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        Located next to the URL address bar at the top, or tap the three dots <strong>(•••)</strong> at the bottom right.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-gray-900 flex items-center gap-1.5">
                        Tap &quot;Add to Home Screen&quot; <PlusSquare className="w-3.5 h-3.5 text-[#4029AB]" />
                      </p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        In the Chrome share options, tap <strong>Add to Home Screen</strong>, verify the app icon, and tap <strong>Add</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-gray-900 flex items-center gap-1.5">
                        In Safari: Tap the Share Button <Share2 className="w-3.5 h-3.5 text-[#4029AB]" />
                      </p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        Located in the bottom navigation bar on iPhone (or top right on iPad).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-gray-900 flex items-center gap-1.5">
                        Scroll down and tap &quot;Add to Home Screen&quot; <PlusSquare className="w-3.5 h-3.5 text-[#4029AB]" />
                      </p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        Verify the BooksCircle icon and tap <strong>Add</strong> in the top-right corner.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Legacy iOS < 16.4 Warning */}
              {environment.isIOSLegacyNonSafari && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-700" />
                    Older iOS version detected
                  </p>
                  <p className="text-[11px]">
                    On iOS versions prior to 16.4, Apple requires adding to Home Screen through <strong>Safari</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="w-full py-2 px-3 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Link Copied — Open in Safari' : 'Copy Link to Open in Safari'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Android (Firefox & Chromium Menu Fallback) */}
          {activeTab === 'android' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    Tap the Browser Menu (⋮) <MoreVertical className="w-3.5 h-3.5 text-[#4029AB]" />
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Open the three-dot menu in {environment.isAndroidFirefox ? 'Firefox' : 'Chrome, Edge, or Samsung Internet'}.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    Tap &quot;Install app&quot; or &quot;Add app to Home screen&quot; <Download className="w-3.5 h-3.5 text-[#4029AB]" />
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Confirm the dialog to add BooksCircle to your Android Home Screen and App Drawer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. macOS Safari (Sonoma+) */}
          {activeTab === 'macos-safari' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    Click File → &quot;Add to Dock...&quot; in Safari
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    In the macOS Safari top menu bar, open <strong>File</strong> (or click the Share button in the toolbar) and select <strong>Add to Dock...</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900">
                    Click &quot;Add&quot; to Launch from macOS Dock
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    BooksCircle will be saved in your Applications folder and macOS Dock as a standalone app.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. Windows 10/11, macOS, Linux & ChromeOS (Chrome / Edge / Brave) */}
          {activeTab === 'desktop' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    Click the Install Icon in the Address Bar <Download className="w-3.5 h-3.5 text-[#4029AB]" />
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    In Chrome, Microsoft Edge, or Brave on Windows, macOS, Linux, or ChromeOS, click the install icon on the right side of the URL bar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900">
                    Confirm &quot;Install&quot; to Open Standalone Window
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Your browser window will immediately morph into a standalone desktop app and offer Taskbar, Start Menu, or Dock pinning.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED HARD REFRESH / CACHE FLUSH (User Explicit Requirement) */}
          <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 text-[#4029AB] ${isFlushing ? 'animate-spin' : ''}`} />
                Seeing an older version?
              </span>
              <span className="text-[10px] font-semibold text-gray-500">
                Build 2026.10.25.v17
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Mobile browsers aggressively cache PWA files. Tap below to flush all storage and force-load the latest verified version.
            </p>
            <button
              type="button"
              disabled={isFlushing}
              onClick={handleFlushCache}
              className="w-full py-2.5 px-3 rounded-xl border border-[#4029AB]/30 bg-white hover:bg-gray-50 active:scale-[0.98] text-[#4029AB] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#4029AB] ${isFlushing ? 'animate-spin' : ''}`} />
              <span>{isFlushing ? 'Flushing cache & reloading...' : 'Flush Cache & Force Reload App'}</span>
            </button>
          </div>

          {/* Action Footer: Clear close button */}
          <div className="pt-1 flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 bg-gray-900 hover:bg-gray-950 active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              Close Instructions
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
