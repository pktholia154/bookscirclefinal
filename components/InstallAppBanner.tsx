'use client';

import React from 'react';
import Image from 'next/image';
import { Download, Star, X, ShieldCheck, Smartphone, Monitor, HelpCircle } from 'lucide-react';
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
    isStandalone,
    isInstalled,
    isDismissed,
    isInstalling,
    installProgress,
    installStepText,
    platform,
    promptInstall,
    dismissBanner,
    openIOSPrompt,
  } = usePWAInstall();

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

  // Hide banner if already running in standalone mode, already installed & acknowledged, or dismissed (unless actively installing)
  if ((isStandalone || isInstalled || isDismissed) && !isInstalling) {
    return null;
  }

  const platformLabel =
    platform === 'android'
      ? 'Android App'
      : platform === 'ios'
      ? 'iOS Web App'
      : platform === 'windows'
      ? 'Windows App'
      : platform === 'mac'
      ? 'macOS App'
      : 'Web App';

  // SVG Circular Progress Bar geometry (r = 16 -> circumference = 2 * PI * 16 ≈ 100.53)
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(100, installProgress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

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
          {/* Left: App Icon (with Circular Progress Ring while installing) + App Meta */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            {/* App Icon Container */}
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-2xs shrink-0 flex items-center justify-center">
              <Image
                src="/booksCircle%20(3).png"
                alt="BooksCircle App Icon"
                width={44}
                height={44}
                unoptimized
                className={`object-contain rounded-xl transition-transform duration-300 ${
                  isInstalling ? 'scale-75 opacity-85' : 'scale-100'
                }`}
                priority
              />

              {/* Overlay Circular Progress Ring on Icon when installing */}
              {isInstalling && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
                  <svg
                    className="w-10 h-10 -rotate-90 transform"
                    viewBox="0 0 40 40"
                    aria-hidden="true"
                  >
                    <circle
                      cx="20"
                      cy="20"
                      r={radius}
                      fill="transparent"
                      stroke="#E5E7EB"
                      strokeWidth="3"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r={radius}
                      fill="transparent"
                      stroke="#4029AB"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-150 ease-out"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-black text-[#4029AB] tabular-nums">
                    {clampedProgress}%
                  </span>
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
                  {platform === 'windows' || platform === 'mac' || platform === 'desktop' ? (
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
                    {installStepText || 'Installing web app to home screen...'}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] sm:text-xs text-gray-600 truncate mt-0.5 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#4029AB] shrink-0 hidden sm:inline" />
                  <span>Instant home screen access • Offline PDF reader • Fast &amp; light</span>
                </p>
              )}
            </div>
          </div>

          {/* Right: Circular Progress Indicator / Install CTA + Help / Dismiss */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {isInstalling ? (
              <div
                id="home-install-app-progress-pill"
                role="progressbar"
                aria-valuenow={clampedProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="App installation progress"
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#4029AB]/10 border border-[#4029AB]/25 text-[#4029AB] text-xs font-black flex items-center gap-2 select-none"
              >
                {/* Compact Circular Progress SVG inside CTA */}
                <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.2"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 9}
                      strokeDashoffset={
                        2 * Math.PI * 9 - (clampedProgress / 100) * (2 * Math.PI * 9)
                      }
                      className="transition-all duration-150 ease-out"
                    />
                  </svg>
                </div>
                <span className="tabular-nums">{clampedProgress}%</span>
                <span className="hidden sm:inline text-[11px] font-bold">Installing</span>
              </div>
            ) : (
              <>
                {platform === 'ios' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openIOSPrompt();
                    }}
                    className="p-1.5 text-gray-500 hover:text-[#4029AB] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    title="How to add to Home Screen on iOS"
                    aria-label="iOS install instructions"
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
                  <span className="font-bold">Install</span>
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
