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
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

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
          className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-gray-100 z-10 space-y-4"
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
                <h3 className="text-base font-black text-gray-950">
                  Install BooksCircle App
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Platform-specific installation guide ({environment.browserName})
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

          {/* 1. In-App WebView Breakout Warning (Instagram, FB, LinkedIn, WhatsApp, X) */}
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

          {/* 2. iOS / iPadOS (16.4+ Safari/Chrome/Edge/Firefox OR <16.4 Legacy Non-Safari) */}
          {activeTab === 'ios' && (
            <div className="space-y-2.5 pt-1">
              {environment.isIOSLegacyNonSafari && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                  <p className="font-bold">Older iOS version detected in non-Safari browser</p>
                  <p className="text-[11px]">
                    On iOS versions prior to 16.4, Apple requires opening the link in <strong>Safari</strong> to add to your Home Screen.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="w-full py-2 px-3 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Link Copied — Open Safari' : 'Copy Link to Open in Safari'}</span>
                  </button>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    Tap the Share button <Share2 className="w-3.5 h-3.5 text-[#4029AB]" />
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Located in the bottom toolbar on iPhone (or top address bar on iPad / Chrome / Edge).
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
                    Verify the BooksCircle icon preview and tap <strong>Add</strong> in the top-right corner.
                  </p>
                </div>
              </div>
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

          {/* Honest Post-Install Guidance Notice (Section 4.2.3: Never fake "Installation Successful" on manual platforms) */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#4029AB]/5 border border-[#4029AB]/15">
            <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-[#4029AB]">
                Launch from Home Screen or Dock
              </p>
              <p className="text-gray-600 text-[11px] mt-0.5">
                Follow the steps above. Once added, open the app directly from your Home Screen or Dock.
              </p>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 bg-gray-900 hover:bg-gray-950 active:scale-98 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              Got It
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
