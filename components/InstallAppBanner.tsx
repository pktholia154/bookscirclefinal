'use client';

import React from 'react';
import Image from 'next/image';
import {
  Download,
  Star,
  X,
  ShieldCheck,
  Smartphone,
  Monitor,
  HelpCircle,
  ExternalLink,
  Loader2,
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
    isInstalledVerified,
    isInstalledOnDevice,
    isDismissed,
    isInstalling,
    installStepText,
    machineState,
    platform,
    environment,
    promptInstall,
    dismissBanner,
    openIOSPrompt,
  } = usePWAInstall();

  // Suppress banner before client mount, when already running in standalone mode,
  // when verified installed in this session, on standard Firefox Desktop (no standalone PWA engine),
  // or when dismissed by the user.
  if (
    !isMounted ||
    isStandalone ||
    isInstalledVerified ||
    environment.isDesktopFirefox ||
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

  const platformLabel = environment.isInAppWebView
    ? 'Open in System Browser'
    : environment.isMacOSSafari
    ? 'macOS Dock App'
    : platform === 'android'
    ? 'Android App'
    : platform === 'ios'
    ? 'iOS Home Screen App'
    : platform === 'windows'
    ? 'Windows App'
    : platform === 'mac'
    ? 'macOS App'
    : platform === 'chromeos'
    ? 'ChromeOS App'
    : 'Desktop Web App';

  const statusSubtitle =
    machineState === 'AWAITING_USER_CHOICE'
      ? 'Waiting for confirmation in the browser dialog...'
      : machineState === 'OS_HANDOFF_IN_PROGRESS'
      ? 'Finalizing installation with your operating system...'
      : installStepText || 'Waiting for confirmation in the browser dialog...';

  return (
    <div
      id="home-install-app-banner-wrapper"
      className={`px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pt-2 pb-1 ${className}`}
    >
      <section
        id="home-install-app-banner"
        aria-live="polite"
        className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-[#4029AB]/20 bg-white p-2.5 sm:p-3.5 shadow-2xs transition-all hover:border-[#4029AB]/35"
      >
        {/* Subtle single-token background wash */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#4029AB]/[0.06] via-[#4029AB]/[0.02] to-white pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: App Icon (with Indeterminate Spinner while awaiting choice / OS handoff) + App Meta */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-2xs shrink-0 flex items-center justify-center">
              <Image
                src="/icon-192x192.png"
                alt="BooksCircle App Icon"
                width={44}
                height={44}
                referrerPolicy="no-referrer"
                className={`object-contain rounded-xl transition-transform duration-300 ${
                  isInstalling ? 'scale-75 opacity-80' : 'scale-100'
                }`}
                priority
              />

              {/* Event-Synchronized Indeterminate Spinner (Zero Fake Percentage Bars) */}
              {isInstalling && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[1px]">
                  <Loader2
                    className="w-6 h-6 text-[#4029AB] animate-spin"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>

            {/* App Details & Status */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm md:text-base font-black text-gray-950 tracking-tight truncate">
                  BooksCircle App
                </h3>

                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-[#4029AB]/10 text-[#4029AB]">
                  <Star className="w-2.5 h-2.5 fill-[#4029AB] text-[#4029AB]" />
                  <span>4.8</span>
                </span>

                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                  {platform === 'windows' ||
                  platform === 'mac' ||
                  platform === 'linux' ||
                  platform === 'chromeos' ||
                  platform === 'desktop' ? (
                    <Monitor className="w-2.5 h-2.5 text-gray-600" />
                  ) : (
                    <Smartphone className="w-2.5 h-2.5 text-gray-600" />
                  )}
                  <span>{platformLabel}</span>
                </span>
              </div>

              {isInstalling ? (
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-[11px] sm:text-xs font-bold text-[#4029AB] truncate">
                    {statusSubtitle}
                  </span>
                </div>
              ) : isInstalledOnDevice ? (
                <p className="text-[11px] sm:text-xs text-gray-700 truncate mt-0.5 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#4029AB] shrink-0" />
                  <span>Already installed on your device • Tap Open App to launch</span>
                </p>
              ) : environment.isInAppWebView ? (
                <p className="text-[11px] sm:text-xs text-gray-600 truncate mt-0.5 font-medium">
                  Tap menu (•••) → Open in System Browser to install standalone app
                </p>
              ) : (
                <p className="text-[11px] sm:text-xs text-gray-600 truncate mt-0.5 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#4029AB] shrink-0 hidden sm:inline" />
                  <span>Instant home screen access • Offline PDF reader • Fast &amp; light</span>
                </p>
              )}
            </div>
          </div>

          {/* Right: Indeterminate Status / Duplicate Prevention Open App / Install CTA */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {isInstalling ? (
              <div
                id="home-install-app-progress-pill"
                role="status"
                aria-live="polite"
                aria-label={statusSubtitle}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#4029AB]/10 border border-[#4029AB]/25 text-[#4029AB] text-xs font-black flex items-center gap-2 select-none"
              >
                <Loader2 className="w-4 h-4 text-[#4029AB] animate-spin shrink-0" />
                <span className="text-[11px] font-bold whitespace-nowrap">
                  {machineState === 'OS_HANDOFF_IN_PROGRESS' ? 'Finalizing...' : 'Confirming...'}
                </span>
              </div>
            ) : isInstalledOnDevice ? (
              <>
                <a
                  id="home-open-installed-app-link"
                  href="/?source=pwa"
                  className="px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[36px]"
                >
                  <span>Already Installed — Open App</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white shrink-0" />
                </a>
                <button
                  type="button"
                  id="home-install-app-dismiss-btn"
                  onClick={handleDismiss}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Dismiss banner"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </>
            ) : (
              <>
                {(platform === 'ios' ||
                  environment.isMacOSSafari ||
                  environment.isAndroidFirefox ||
                  environment.isInAppWebView) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openIOSPrompt();
                    }}
                    className="p-1.5 text-gray-500 hover:text-[#4029AB] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Platform installation instructions"
                    aria-label="Platform installation instructions"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  id="home-install-app-cta-btn"
                  onClick={handleInstallClick}
                  className="px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[36px]"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                  <span className="font-bold">
                    {environment.isInAppWebView
                      ? 'How to Install'
                      : environment.isMacOSSafari
                      ? 'Add to Dock'
                      : 'Install'}
                  </span>
                </button>

                <button
                  type="button"
                  id="home-install-app-dismiss-btn"
                  onClick={handleDismiss}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Dismiss app install banner"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
