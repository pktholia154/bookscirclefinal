'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Star, X, Sparkles, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InstallAppBannerProps {
  onInstall?: () => void;
  isInstallable?: boolean;
  className?: string;
}

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({
  onInstall,
  isInstallable = true,
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA mode
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);

      // Check if dismissed in this session
      try {
        const dismissed = sessionStorage.getItem('bookscircle_app_banner_dismissed');
        if (dismissed === 'true') {
          setIsDismissed(true);
        }
      } catch {}
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    try {
      sessionStorage.setItem('bookscircle_app_banner_dismissed', 'true');
    } catch {}
  };

  // Hide if already running in standalone app or dismissed
  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <div
      id="home-install-app-banner-wrapper"
      className={`px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pt-2 pb-1 ${className}`}
    >
      <section
        id="home-install-app-banner"
        className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-[#4029AB]/20 bg-gradient-to-r from-[#4029AB]/[0.08] via-[#4029AB]/[0.03] to-white p-2.5 sm:p-3.5 shadow-2xs transition-all hover:border-[#4029AB]/30"
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-[#4029AB]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: App Icon + App Meta */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            {/* App Icon */}
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl overflow-hidden bg-white border border-[#4029AB]/20 shadow-xs shrink-0 flex items-center justify-center p-1">
              <Image
                src="/icon-192.png"
                alt="BooksCircle App Icon"
                width={48}
                height={48}
                className="object-contain rounded-lg"
                priority
              />
            </div>

            {/* App Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm md:text-base font-black text-gray-950 tracking-tight truncate">
                  BooksCircle App
                </h3>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-[#4029AB]/10 text-[#4029AB]">
                  <Star className="w-2.5 h-2.5 fill-[#4029AB] text-[#4029AB]" />
                  <span>4.8</span>
                </span>
                <span className="hidden sm:inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Free
                </span>
              </div>

              <p className="text-[11px] sm:text-xs text-gray-600 truncate mt-0.5 font-medium">
                Read offline • Instant access • High-speed PDF reader
              </p>
            </div>
          </div>

          {/* Right: Install CTA + Dismiss */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              id="home-install-app-cta-btn"
              onClick={onInstall}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span className="font-bold">Install</span>
            </button>

            <button
              type="button"
              id="home-install-app-dismiss-btn"
              onClick={handleDismiss}
              className="p-1 sm:p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Dismiss app install banner"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
