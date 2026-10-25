'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InstallSuccessModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLaunch?: () => void;
}

/**
 * Synchronized PWA Install Success Modal.
 * Appears ONLY when the operating system / browser actually completes the background
 * installation and fires the native 'appinstalled' event.
 * Eliminates premature success messages before the browser's system notification.
 */
export const InstallSuccessModal: React.FC<InstallSuccessModalProps> = ({
  isOpen = false,
  onClose,
  onLaunch,
}) => {
  // Auto-close after 8 seconds
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="w-full max-w-sm rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 shadow-2xs">
              <Image
                src="/icon-192x192.png"
                alt="BooksCircle App Icon"
                width={48}
                height={48}
                className="object-contain"
              />
              <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-white" />
              </span>
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Verified Installed
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-gray-950 mt-0.5">
                BooksCircle Installed!
              </h3>
              <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                Added to your Home screen & ready for offline study.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-gray-100">
            <Link
              href="/?source=pwa"
              onClick={() => {
                if (onLaunch) onLaunch();
                if (onClose) onClose();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <span>Open Installed App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold active:scale-95 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
