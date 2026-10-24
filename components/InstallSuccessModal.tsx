'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

interface InstallSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch?: () => void;
}

export const InstallSuccessModal: React.FC<InstallSuccessModalProps> = ({
  isOpen,
  onClose,
  onLaunch,
}) => {
  const {
    isInstalling,
    isLaunching,
    installProgress,
    installStepText,
    isInstallSuccessOpen,
    platform,
    launchInstalledApp,
    closeInstallSuccess,
  } = usePWAInstall();

  const shouldShowModal = isInstalling || isLaunching || isOpen || isInstallSuccessOpen;

  // Handle Escape key to close when installation is finished
  useEffect(() => {
    if (!shouldShowModal || isInstalling || isLaunching) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        closeInstallSuccess();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shouldShowModal, isInstalling, isLaunching, onClose, closeInstallSuccess]);

  if (!shouldShowModal) return null;

  const handleClose = () => {
    if (isInstalling || isLaunching) return;
    onClose();
    closeInstallSuccess();
  };

  const handleLaunchApp = () => {
    if (onLaunch) {
      onLaunch();
    }
    launchInstalledApp();
  };

  // Circular progress SVG parameters (r = 38 -> circumference ≈ 238.76)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(100, installProgress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const deviceName =
    platform === 'android'
      ? 'Android Home Screen'
      : platform === 'ios'
      ? 'iPhone / iPad'
      : platform === 'windows'
      ? 'Windows Desktop'
      : platform === 'mac'
      ? 'macOS Dock'
      : 'Device Home Screen';

  return (
    <AnimatePresence>
      <div
        id="install-success-notification-overlay"
        onClick={handleClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-success-title"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 z-10 flex flex-col items-center text-center"
        >
          {/* Top-right Close Cross Button (Available once installed) */}
          {!isInstalling && !isLaunching && (
            <button
              type="button"
              id="install-success-close-cross-btn"
              onClick={handleClose}
              aria-label="Close popup"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 hover:text-gray-950 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {isInstalling ? (
            /* STATE 1: REAL EVENT-SYNCED CIRCULAR PROGRESS BAR DURING INSTALLATION */
            <div className="w-full py-2 flex flex-col items-center space-y-4">
              <div
                className="relative w-24 h-24 flex items-center justify-center"
                role="progressbar"
                aria-valuenow={clampedProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Installing BooksCircle App"
              >
                <svg className="w-24 h-24 -rotate-90 transform" viewBox="0 0 92 92">
                  <circle
                    cx="46"
                    cy="46"
                    r={radius}
                    fill="transparent"
                    stroke="#F3F4F6"
                    strokeWidth="6"
                  />
                  <circle
                    cx="46"
                    cy="46"
                    r={radius}
                    fill="transparent"
                    stroke="#4029AB"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-200 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-white shadow-xs flex items-center justify-center">
                    <Image
                      src="/booksCircle%20(3).png"
                      alt="BooksCircle"
                      width={40}
                      height={40}
                      unoptimized
                      className="object-contain rounded-xl"
                      priority
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 px-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4029AB]/10 text-[#4029AB] text-xs font-black tabular-nums">
                  <span>Installing • {clampedProgress}%</span>
                </div>
                <h3
                  id="install-success-title"
                  className="text-base sm:text-lg font-black text-gray-950 tracking-tight"
                >
                  Installing BooksCircle App
                </h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  {installStepText || 'Verifying device installer & syncing live catalog...'}
                </p>
              </div>
            </div>
          ) : (
            /* STATE 2: APP INSTALLED SUCCESSFULLY & HARD-SYNC LAUNCH POPUP */
            <div className="w-full flex flex-col items-center space-y-4 pt-1">
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-[#4029AB]/[0.06] border border-[#4029AB]/20 flex items-center justify-center p-2 shadow-xs">
                  <Image
                    src="/booksCircle%20(3).png"
                    alt="BooksCircle"
                    width={60}
                    height={60}
                    unoptimized
                    className="object-contain rounded-xl"
                    priority
                  />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 bg-gray-950 text-white rounded-full p-1 shadow-md border-2 border-white">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="space-y-1.5 px-1">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[10px] font-bold">
                  {platform === 'windows' || platform === 'mac' || platform === 'desktop' ? (
                    <Monitor className="w-3 h-3 text-[#4029AB]" />
                  ) : (
                    <Smartphone className="w-3 h-3 text-[#4029AB]" />
                  )}
                  <span>Installed on {deviceName}</span>
                </div>

                <h3
                  id="install-success-title"
                  className="text-lg sm:text-xl font-black text-gray-950 tracking-tight"
                >
                  App Installed Successfully
                </h3>

                <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                  BooksCircle has been added to your home screen and synced with the live catalog.
                </p>
              </div>

              <div className="w-full grid grid-cols-2 gap-2 pt-0.5">
                <div className="px-2.5 py-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#4029AB] shrink-0" />
                  <span>Cache Flushed</span>
                </div>
                <div className="px-2.5 py-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4029AB] shrink-0" />
                  <span>Live DB Synced</span>
                </div>
              </div>

              {/* Primary CTA: Launch App (Performs Full Cache Flush + Hard Reload) & Secondary: Close */}
              <div className="w-full space-y-2 pt-1">
                <button
                  type="button"
                  id="install-success-launch-btn"
                  disabled={isLaunching}
                  onClick={handleLaunchApp}
                  className="w-full py-3 px-4 rounded-2xl bg-[#4029AB] hover:bg-[#34208e] active:scale-[0.98] text-white text-xs sm:text-sm font-black shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
                >
                  {isLaunching ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-white animate-spin shrink-0" />
                      <span>Syncing &amp; Launching App...</span>
                    </>
                  ) : (
                    <>
                      <span>Launch App</span>
                      <ExternalLink className="w-4 h-4 text-white shrink-0" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="install-success-close-btn"
                  disabled={isLaunching}
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] text-gray-700 hover:text-gray-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
