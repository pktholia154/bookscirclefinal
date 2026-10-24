'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  Share2,
  PlusSquare,
  CheckCircle2,
  Smartphone,
  Monitor,
  MoreVertical,
  Download,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

interface IOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'android' | 'ios' | 'windows';

export const IOSInstallGuideModal: React.FC<IOSInstallGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    platform,
    isIOSPromptOpen,
    isLaunching,
    closeIOSPrompt,
    launchInstalledApp,
  } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<GuideTab>('ios');

  useEffect(() => {
    if (platform === 'android') setActiveTab('android');
    else if (platform === 'windows' || platform === 'mac' || platform === 'desktop') {
      setActiveTab('windows');
    } else {
      setActiveTab('ios');
    }
  }, [platform]);

  const shouldShow = isOpen || isIOSPromptOpen;
  if (!shouldShow) return null;

  const handleClose = () => {
    onClose();
    closeIOSPrompt();
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
                  src="/booksCircle%20(3).png"
                  alt="BooksCircle Logo"
                  fill
                  unoptimized
                  className="object-contain rounded-xl"
                />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-950">
                  Install on Device Home Screen
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Direct browser installation steps for your device
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
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-white text-[#4029AB] shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white text-[#4029AB] shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iOS / iPad</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('windows')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'windows'
                  ? 'bg-white text-[#4029AB] shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Windows / PC</span>
            </button>
          </div>

          {/* Step by step guide per platform */}
          {activeTab === 'ios' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    Tap the Safari Share button <Share2 className="w-3.5 h-3.5 text-[#4029AB]" />
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Located at the bottom bar of Safari on iPhone (or top right on iPad).
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
                    Scroll down the share sheet and tap &quot;Add to Home Screen&quot;, then tap &quot;Add&quot;.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    Tap the Browser Menu <MoreVertical className="w-3.5 h-3.5 text-[#4029AB]" />
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Open the three-dot menu at the top right of Chrome or your Android browser.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    Tap &quot;Install App&quot; or &quot;Add to Home screen&quot; <Download className="w-3.5 h-3.5 text-[#4029AB]" />
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Confirm the prompt to install the BooksCircle WebAPK directly on your launcher.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'windows' && (
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
                    In Chrome or Microsoft Edge on Windows/Mac, click the App Install icon on the right side of the URL bar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    Click &quot;Install&quot; to Pin to Taskbar / Start Menu
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    If already installed, open BooksCircle from your desktop or click Sync &amp; Launch below.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#4029AB]/5 border border-[#4029AB]/15">
            <div className="w-7 h-7 rounded-lg bg-[#4029AB] text-white flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-[#4029AB]">
                Live Catalog Cache Flushed &amp; Synced
              </p>
              <p className="text-gray-600 text-[11px] mt-0.5">
                Stale cache has been cleared so your app is 100% in sync with the live BooksCircle database.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={isLaunching}
              onClick={launchInstalledApp}
              className="w-full py-3 bg-[#4029AB] hover:bg-[#34208e] active:scale-98 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-75"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLaunching ? 'animate-spin' : ''}`} />
              <span>{isLaunching ? 'Syncing...' : 'Sync & Launch'}</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 active:scale-98 text-gray-800 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
