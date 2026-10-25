'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Download,
  X,
  ExternalLink,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

interface InstallAppBannerProps {
  onInstall?: () => void;
  isInstallable?: boolean;
  className?: string;
}

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({
  onInstall,
  className = '',
}) => {
  const {
    isMounted,
    isStandalone,
    isInstalled,
    isInstalledOnDevice,
    isIOS,
    platform,
    environment,
    canShowNativeInstallUI,
    isDismissed,
    isInstalling,
    showInlineFallbackHint,
    promptInstall,
    dismissBanner,
    closeInlineFallbackHint,
  } = usePWAInstall();

  // Never show Android-style installation banners on iOS, in standalone mode,
  // when already installed, on unsupported browsers, or when dismissed.
  if (
    !isMounted ||
    isIOS ||
    platform === 'ios' ||
    isStandalone ||
    isInstalled ||
    !canShowNativeInstallUI ||
    (isDismissed && !isInstalling)
  ) {
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

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstalling) return;
    dismissBanner();
  };

  const platformSubtitle =
    platform === 'android'
      ? `Fast offline PDF reader for ${environment.browserName} on Android`
      : platform === 'windows'
      ? `Standalone desktop app for ${environment.browserName} on Windows`
      : environment.isMacOSSafari
      ? 'Add to macOS Dock via Safari File → Add to Dock'
      : `Standalone app experience for ${environment.browserName}`;

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
    return `In ${environment.browserName}: Click the Install icon in the right side of the address bar (or menu ⋮ → Install BooksCircle).`;
  };

  return (
    <div
      id="home-install-app-banner-wrapper"
      className={`px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pt-2 pb-1 ${className}`}
    >
      <section
        id="home-install-app-banner"
        aria-live="polite"
        className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3.5 shadow-2xs transition-all hover:border-[#4029AB]/35"
      >
        <div className="relative z-10 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: App Icon + Title & Platform-Specific Description */}
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
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <h3 className="text-xs sm:text-sm md:text-base font-black text-gray-950 tracking-tight truncate">
                  BooksCircle App
                </h3>
                <span aria-hidden="true">·</span>
                <span className="text-[11px] text-gray-500 font-medium truncate">
                  {environment.browserName}
                </span>
              </div>

              <p className="text-[11px] sm:text-xs text-gray-600 truncate mt-0.5 font-medium">
                {isInstalledOnDevice
                  ? 'Installed on your device · Launch standalone reader'
                  : platformSubtitle}
              </p>
            </div>
          </div>

          {/* Right: Contextual Install Now CTA */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {isInstalling ? (
              <div
                id="home-install-app-progress-pill"
                role="status"
                aria-live="polite"
                className="px-3.5 py-2 rounded-lg sm:rounded-xl bg-gray-100 text-gray-800 text-xs font-bold flex items-center gap-2 select-none whitespace-nowrap"
              >
                <Loader2 className="w-3.5 h-3.5 text-[#4029AB] animate-spin shrink-0" />
                <span>Prompting...</span>
              </div>
            ) : isInstalledOnDevice ? (
              <>
                <Link
                  id="home-open-installed-app-link"
                  href="/?source=pwa"
                  className="px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[38px]"
                >
                  <span>Open App</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white shrink-0" />
                </Link>
                <button
                  type="button"
                  id="home-install-app-dismiss-btn"
                  onClick={handleDismiss}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label="Dismiss banner"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  id="home-install-app-cta-btn"
                  onClick={handleInstallClick}
                  className="px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[38px]"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                  <span>Install Now</span>
                </button>

                <button
                  type="button"
                  id="home-install-app-dismiss-btn"
                  onClick={handleDismiss}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label="Dismiss app install banner"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Lightweight Inline Fallback Instruction (Shown only if native prompt could not auto-open) */}
        {showInlineFallbackHint && !isInstalledOnDevice && (
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
