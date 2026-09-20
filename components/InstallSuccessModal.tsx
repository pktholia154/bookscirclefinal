'use client';

import React from 'react';
import Image from 'next/image';
import { X, CheckCircle2, Smartphone, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InstallSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallSuccessModal: React.FC<InstallSuccessModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="install-success-notification-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-success-title"
      >
        {/* Subtle backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
        />

        {/* Notification Dialog Box */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-gray-100 z-10 space-y-4"
        >
          {/* Top-Right Cross Button to Close Popup */}
          <button
            type="button"
            id="install-success-close-cross-btn"
            onClick={onClose}
            aria-label="Close notification"
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Header with App Icon & Success Badge */}
          <div className="flex items-center gap-3.5 pt-1 pr-8">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white border border-[#4029AB]/20 shadow-sm shrink-0 flex items-center justify-center p-1">
              <Image
                src="/icon-192.png"
                alt="BooksCircle App Icon"
                width={56}
                height={56}
                className="object-contain rounded-xl"
                priority
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-white fill-emerald-600" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Installed Successfully</span>
              </div>
              <h3
                id="install-success-title"
                className="text-base sm:text-lg font-black text-gray-950 tracking-tight leading-snug"
              >
                BooksCircle is on your device!
              </h3>
            </div>
          </div>

          {/* Informational Guidance Cards */}
          <div className="space-y-2.5 pt-1">
            {/* Card 1: Main Home Screen Placement Guidance */}
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#4029AB]/[0.05] border border-[#4029AB]/15 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4029AB] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-gray-950">
                  Find on Your Home Screen or App Drawer
                </p>
                <p className="text-gray-600 leading-relaxed font-normal">
                  The BooksCircle icon is now added to your device. You can open it anytime directly like any native mobile app.
                </p>
              </div>
            </div>

            {/* Card 2: Pro-Tip to Move to Main Page / Top Dock */}
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-950">
                  Tip: Pin to Main Home Page or Dock
                </p>
                <p className="text-amber-900/85 leading-relaxed font-normal">
                  Press and hold the BooksCircle icon on your screen, then drag it to your main front page or bottom favorites bar for fastest 1-tap reading.
                </p>
              </div>
            </div>

            {/* Card 3: Offline Reading Benefit */}
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gray-50 border border-gray-200/70 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-gray-900">
                  Offline & Fast Reading
                </p>
                <p className="text-gray-600 leading-relaxed font-normal">
                  Your reading history, free book samples, and purchases work smoothly even without an active internet connection.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button to Dismiss and Start Reading */}
          <div className="pt-2">
            <button
              type="button"
              id="install-success-got-it-btn"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white font-bold text-xs sm:text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Got it, Continue Reading</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
