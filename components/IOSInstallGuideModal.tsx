'use client';

import React from 'react';
import Image from 'next/image';
import { X, Share2, PlusSquare, ArrowDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuideModal: React.FC<IOSInstallGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
        {/* Backdrop click to dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-gray-100 z-10 space-y-5"
        >
          {/* Header & Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-xs border border-gray-100 shrink-0 bg-white">
                <Image
                  src="/logo.svg"
                  alt="BooksCircle Logo"
                  fill
                  className="object-contain p-1"
                />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-950">
                  Install BooksCircle
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Add to Home Screen for instant full screen access
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step by step guide */}
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                1
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                  Tap the Safari Share button <Share2 className="w-3.5 h-3.5 text-[#4029AB]" />
                </p>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Located at the bottom of your Safari browser bar (or top right on iPad).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-[#4029AB] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                2
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                  Select &quot;Add to Home Screen&quot; <PlusSquare className="w-3.5 h-3.5 text-[#4029AB]" />
                </p>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Scroll down the share menu options and tap &quot;Add to Home Screen&quot;.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#4029AB]/5 border border-[#4029AB]/15">
              <div className="w-8 h-8 rounded-xl bg-[#4029AB] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-[#4029AB]">
                  Launch Like a Native App
                </p>
                <p className="text-gray-600 text-[11px] mt-0.5">
                  Opens full screen without browser bars, with matching status bar color &amp; instant offline speed.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-[#4029AB] hover:bg-[#34208e] active:scale-98 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
          >
            Got it, thanks!
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
