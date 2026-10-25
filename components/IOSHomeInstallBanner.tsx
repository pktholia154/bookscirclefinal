'use client';

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare } from 'lucide-react';

/**
 * Permanent, minimal iOS installation instruction banner.
 * Placed on the home page directly above categories.
 * Strictly visible ONLY on iOS devices (iPhone, iPad, iPod) and never on Android or Windows.
 * Persists permanently even after installation / in standalone mode as requested.
 */
export function IOSHomeInstallBanner() {
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
      className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pt-2 pb-1"
    >
      <section
        id="ios-home-install-banner"
        aria-label="iOS Installation Guide"
        className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/90 shadow-2xs space-y-2 transition-all"
      >
        <h3 className="text-sm sm:text-base font-bold text-gray-950 tracking-tight">
          To Install App on Home Page
        </h3>
        <div className="space-y-1.5 text-xs sm:text-sm text-gray-800 font-medium">
          <div className="flex items-center gap-2">
            <span>Tap Share</span>
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 border border-gray-300 text-gray-800 shrink-0 shadow-2xs"
              title="Share"
            >
              <Share className="w-3.5 h-3.5 stroke-[2]" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Add to Home Screen</span>
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 border border-gray-300 text-gray-800 shrink-0 shadow-2xs"
              title="Add to Home Screen"
            >
              <PlusSquare className="w-3.5 h-3.5 stroke-[2]" />
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
