'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Download,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Sparkles,
  MoreVertical,
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

interface InstallAppBannerProps {
  onInstall?: () => void;
  isInstallable?: boolean;
  className?: string;
}

/**
 * Full banner bar with app icon and Install Now CTA for Android & Windows.
 * Rendered on Home page (above categories) and Book details page (above About this book).
 * Synchronized with the header install button and native browser lifecycle.
 * Strictly hidden on iOS (iOS uses permanent IOSHomeInstallBanner) and inside standalone mode.
 */
export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({
  onInstall,
  className = '',
}) => {
  const {
    isMounted,
    isStandalone,
    isInstalledOnDevice,
    isIOS,
    platform,
    environment,
    canShowNativeInstallUI,
    isInstalling,
    showInlineFallbackHint,
    promptInstall,
    closeInlineFallbackHint,
  } = usePWAInstall();

  // Never show on iOS (iOS has its own permanent banner) or in standalone mode
  if (!isMounted || isIOS || platform === 'ios' || isStandalone) {
    return null;
  }

  // Display on Android, Windows, and Chromium/desktop browsers
  const isTargetPlatform =
    platform === 'android' ||
    platform === 'windows' ||
    canShowNativeInstallUI ||
    isInstalledOnDevice ||
    isInstalling;

  if (!isTargetPlatform) {
    return null;
  }

  const handleInstallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstalling) return;
    if (onInstall) {
      onInstall();
    } else {
      promptInstall();
    }
  };

  const platformSubtitle = isInstalling
    ? 'Installing BooksCircle on your device... (check notification bar)'
    : isInstalledOnDevice
    ? 'Installed on your device · Ready for fast offline reading'
    : platform === 'android'
    ? `Fast offline PDF reader for ${environment.browserName} on Android`
    : platform === 'windows'
    ? `Desktop app for ${environment.browserName} on Windows · Offline reader`
    : `Install app for instant offline access & fast reading`;

  const getFallbackInstruction = () => {
    if (environment.isMacOSSafari) {
      return 'In macOS Safari: Click File → "Add to Dock..." in the top menu bar.';
    }
    if (environment.isAndroidFirefox) {
      return 'In Firefox for Android: Tap the browser menu (⋮) → "Install".';
    }
    if (platform === 'android') {
      return `In ${environment.browserName}: Tap the browser menu (⋮) → "Install app" or "Add to Home screen".`;
    }
    return `In ${environment.browserName}: Click the Install icon in the address bar (or menu ⋮ → Install BooksCircle).`;
  };

  return (
    <div
      id="home-install-app-banner-wrapper"
      className={`px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pt-2 pb-1 ${className}`}
    >
      <section
        id="home-install-app-banner"
        aria-live="polite"
        className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-3.5 shadow-2xs transition-all hover:border-[#4029AB]/35"
      >
        <div className="relative z-10 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: App Icon + Title & Platform-Specific Subtitle */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
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
              {isInstalledOnDevice && (
                <span className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-white" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <h3 className="text-xs sm:text-sm md:text-base font-black text-gray-950 tracking-tight truncate">
                  BooksCircle App
                </h3>
                <span aria-hidden="true">·</span>
                <span className="text-[11px] text-gray-500 font-medium truncate">
                  {platform === 'android' ? 'Android' : platform === 'windows' ? 'Windows' : environment.browserName}
                </span>
              </div>

              <p className="text-[11px] sm:text-xs text-gray-600 truncate mt-0.5 font-medium">
                {platformSubtitle}
              </p>
            </div>
          </div>

          {/* Right: Contextual Synchronized Install / Installing / Open CTA */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {isInstalling ? (
              <div
                id="home-install-app-progress-pill"
                role="status"
                aria-live="polite"
                className="px-3.5 py-2 rounded-lg sm:rounded-xl bg-[#4029AB]/10 text-[#4029AB] text-xs font-bold flex items-center gap-2 select-none whitespace-nowrap border border-[#4029AB]/20"
              >
                <Loader2 className="w-3.5 h-3.5 text-[#4029AB] animate-spin shrink-0" />
                <span>Installing...</span>
              </div>
            ) : isInstalledOnDevice ? (
              <Link
                id="home-open-installed-app-link"
                href="/?source=pwa"
                className="px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[38px]"
                title="Launch Installed Standalone BooksCircle App"
              >
                <span>Open App</span>
                <ExternalLink className="w-3.5 h-3.5 text-white shrink-0" />
              </Link>
            ) : (
              <button
                type="button"
                id="home-install-app-cta-btn"
                onClick={handleInstallClick}
                className="px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[38px]"
                title="Install BooksCircle on your device"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0 stroke-[2.5]" />
                <span>Install Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Lightweight Inline Fallback Instruction (Shown only if native prompt could not auto-open) */}
        {showInlineFallbackHint && !isInstalledOnDevice && !isInstalling && (
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-xs text-gray-700">
            <div className="flex items-center gap-1.5 min-w-0">
              <MoreVertical className="w-3.5 h-3.5 text-[#4029AB] shrink-0" />
              <span className="text-[11px] sm:text-xs font-medium truncate">
                {getFallbackInstruction()}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeInlineFallbackHint();
              }}
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 shrink-0 cursor-pointer px-1.5 py-0.5"
            >
              Hide
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
