'use client';

import React from 'react';
import Image from 'next/image';
import { X, CheckCircle2 } from 'lucide-react';
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-success-title"
      >
        {/* Compact, attractive notification dialog */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 z-10 flex flex-col items-center text-center space-y-4"
        >
          {/* Prominent Cross Button to close notification */}
          <button
            type="button"
            id="install-success-close-cross-btn"
            onClick={onClose}
            aria-label="Close notification"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 hover:text-gray-950 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* App Icon with Success Badge */}
          <div className="relative mt-1">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-[#4029AB]/20 shadow-md flex items-center justify-center p-2">
              <Image
                src="/logo.svg"
                alt="BooksCircle"
                width={56}
                height={56}
                className="object-contain"
                priority
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow-sm border-2 border-white">
              <CheckCircle2 className="w-4 h-4 text-white fill-emerald-600" />
            </div>
          </div>

          {/* Simple, attractive text */}
          <div className="space-y-1.5 px-2">
            <h3
              id="install-success-title"
              className="text-lg font-black text-gray-950 tracking-tight"
            >
              App Installed Successfully!
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
              BooksCircle is ready to use anytime directly from your home screen.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

