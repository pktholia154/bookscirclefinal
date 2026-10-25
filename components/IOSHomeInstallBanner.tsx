'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Share, PlusSquare } from 'lucide-react';

interface IOSHomeInstallBannerProps {
  className?: string;
}

/**
 * Permanent, professional iOS installation banner.
 * Placed:
 * 1. On Home page (above categories)
 * 2. On Book details page (above 'About this book')
 * Strictly visible ONLY on iOS devices (iPhone, iPad, iPod) and never on Android or Windows.
 * Persists permanently even after installation as requested.
 */
export function IOSHomeInstallBanner({ className = '' }: IOSHomeInstallBannerProps) {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent || '';
    const uaLower = ua.toLowerCase();
    const isIPadOS =
      /ipad/.test(uaLower) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const detectedIOS = /iphone|ipad|ipod/.test(uaLower) || isIPadOS;
    setIsIOS(detectedIOS);
  }, []);

  if (!isIOS) return null;

  return (
    <div
      id="ios-home-install-banner-wrapper"
      className={`px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pt-2 pb-1 ${className}`}
    >
      <section
        id="ios-home-install-banner"
        aria-label="iOS Installation Guide"
        className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-3.5 shadow-2xs hover:border-[#4029AB]/35 transition-all"
      >
        <div className="flex items-center gap-3 sm:gap-3.5">
          {/* App Icon */}
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-2xs shrink-0 flex items-center justify-center">
            <Image
              src="/icon-192x192.png"
              alt="BooksCircle App Icon"
              width={44}
              height={44}
              referrerPolicy="no-referrer"
              className="object-contain rounded-xl"
              priority
            />
          </div>

          {/* Title & Horizontal Step-by-Step Guidance */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <h3 className="text-xs sm:text-sm md:text-base font-black text-gray-950 tracking-tight truncate">
                Install App on Home Page
              </h3>
              <span aria-hidden="true">·</span>
              <span className="text-[10px] font-bold text-[#4029AB] bg-[#4029AB]/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                iOS
              </span>
            </div>

            {/* Steps Row with Theme-Color Violet Outline Icons */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5 text-xs font-semibold text-gray-800">
              <div className="flex items-center gap-1.5">
                <span>Tap Share</span>
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#4029AB]/5 border-1.5 border-[#4029AB] text-[#4029AB] shrink-0 shadow-2xs"
                  title="Safari Share Icon"
                >
                  <Share className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </div>

              <span className="text-gray-300 text-xs hidden sm:inline" aria-hidden="true">
                →
              </span>

              <div className="flex items-center gap-1.5">
                <span>Add to Home Screen</span>
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#4029AB]/5 border-1.5 border-[#4029AB] text-[#4029AB] shrink-0 shadow-2xs"
                  title="Add to Home Screen Icon"
                >
                  <PlusSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
