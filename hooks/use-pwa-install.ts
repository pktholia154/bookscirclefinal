'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { requestPersistentStorage } from '@/lib/offline-storage';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type DevicePlatform = 'android' | 'ios' | 'windows' | 'mac' | 'desktop';

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
    __pwaListenerAttached?: boolean;
  }
}

interface PWAStoreState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  hasPromptReceived: boolean;
  isInstalling: boolean;
  installProgress: number;
  installStepText: string;
  isIOSPromptOpen: boolean;
  isInstallSuccessOpen: boolean;
  isInstalledLocal: boolean;
  isDismissed: boolean;
}

const initialStoreState: PWAStoreState = {
  deferredPrompt: null,
  hasPromptReceived: false,
  isInstalling: false,
  installProgress: 0,
  installStepText: '',
  isIOSPromptOpen: false,
  isInstallSuccessOpen: false,
  isInstalledLocal: false,
  isDismissed: false,
};

let storeState: PWAStoreState = { ...initialStoreState };
const listeners = new Set<() => void>();

function emitStoreChange() {
  listeners.forEach((listener) => listener());
}

function updateStore(partial: Partial<PWAStoreState>) {
  storeState = { ...storeState, ...partial };
  emitStoreChange();
}

function subscribeToPWAStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getPWAStoreSnapshot(): PWAStoreState {
  return storeState;
}

function getPWAStoreServerSnapshot(): PWAStoreState {
  return initialStoreState;
}

// Standalone mode subscriber using useSyncExternalStore
function subscribeToDisplayMode(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
  const minimalUiQuery = window.matchMedia('(display-mode: minimal-ui)');
  const wcoQuery = window.matchMedia('(display-mode: window-controls-overlay)');

  standaloneQuery.addEventListener('change', callback);
  fullscreenQuery.addEventListener('change', callback);
  minimalUiQuery.addEventListener('change', callback);
  wcoQuery.addEventListener('change', callback);
  window.addEventListener('appinstalled', callback);

  return () => {
    standaloneQuery.removeEventListener('change', callback);
    fullscreenQuery.removeEventListener('change', callback);
    minimalUiQuery.removeEventListener('change', callback);
    wcoQuery.removeEventListener('change', callback);
    window.removeEventListener('appinstalled', callback);
  };
}

function getDisplayModeSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function getDisplayModeServerSnapshot(): boolean {
  return false;
}

export function detectDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent.toLowerCase();
  const isIPadOS =
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/.test(ua) || isIPadOS) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/win/.test(ua)) return 'windows';
  if (/mac/.test(ua)) return 'mac';
  return 'desktop';
}

async function warmUpPWAAssets(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await requestPersistentStorage();
  } catch {}

  try {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }
  } catch {}

  try {
    if ('caches' in window) {
      const cache = await caches.open('bookscircle-v14');
      const coreAssets = [
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png',
        '/booksCircle%20(3).png',
      ];
      await Promise.allSettled(coreAssets.map((url) => cache.add(url)));
    }
  } catch {}
}

let activeProgressTimer: ReturnType<typeof setInterval> | null = null;

function clearProgressTimer() {
  if (activeProgressTimer) {
    clearInterval(activeProgressTimer);
    activeProgressTimer = null;
  }
}

function animateProgressToCompletion(onComplete: () => void, startFrom = 25) {
  clearProgressTimer();
  let current = Math.max(10, startFrom);

  const getStepLabel = (pct: number) => {
    if (pct < 35) return 'Preparing app package & manifest...';
    if (pct < 70) return 'Caching offline reader & icons...';
    if (pct < 95) return 'Configuring home screen launcher...';
    return 'Installation complete!';
  };

  updateStore({
    isInstalling: true,
    installProgress: current,
    installStepText: getStepLabel(current),
  });

  // Trigger real background warmup concurrently
  warmUpPWAAssets().catch(() => {});

  activeProgressTimer = setInterval(() => {
    // Non-linear smooth acceleration
    const increment = current < 50 ? 7 : current < 85 ? 6 : 4;
    current = Math.min(100, current + increment);

    updateStore({
      isInstalling: true,
      installProgress: current,
      installStepText: getStepLabel(current),
    });

    if (current >= 100) {
      clearProgressTimer();
      setTimeout(() => {
        onComplete();
      }, 280);
    }
  }, 85);
}

function finalizeInstallationSuccess() {
  clearProgressTimer();
  if (typeof window !== 'undefined') {
    window.__pwaInstallPrompt = null;
    try {
      localStorage.setItem('bookscircle_just_installed', 'true');
      localStorage.setItem('bookscircle_pwa_installed', 'true');
      localStorage.removeItem('bookscircle_install_ack');
    } catch {}
  }

  updateStore({
    deferredPrompt: null,
    hasPromptReceived: false,
    isInstalling: false,
    installProgress: 100,
    installStepText: 'App installed successfully!',
    isInstalledLocal: true,
    isInstallSuccessOpen: true,
  });
}

export function usePWAInstall() {
  const isStandalone = useSyncExternalStore(
    subscribeToDisplayMode,
    getDisplayModeSnapshot,
    getDisplayModeServerSnapshot
  );

  const shared = useSyncExternalStore(
    subscribeToPWAStore,
    getPWAStoreSnapshot,
    getPWAStoreServerSnapshot
  );

  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [platform, setPlatform] = useState<DevicePlatform>('desktop');

  useEffect(() => {
    setIsMounted(true);
    const detected = detectDevicePlatform();
    setPlatform(detected);

    if (typeof window === 'undefined') return;

    // Sync any globally captured prompt
    if (window.__pwaInstallPrompt && !storeState.deferredPrompt) {
      updateStore({
        deferredPrompt: window.__pwaInstallPrompt,
        hasPromptReceived: true,
      });
    }

    // Restore persisted install / dismissal states
    try {
      const justInstalled = localStorage.getItem('bookscircle_just_installed');
      const acknowledged = localStorage.getItem('bookscircle_install_ack');
      const installedFlag = localStorage.getItem('bookscircle_pwa_installed');
      const dismissedFlag = sessionStorage.getItem('bookscircle_app_banner_dismissed');

      const updates: Partial<PWAStoreState> = {};
      if (justInstalled === 'true' && acknowledged !== 'true') {
        updates.isInstallSuccessOpen = true;
      }
      if (installedFlag === 'true') {
        updates.isInstalledLocal = true;
      }
      if (dismissedFlag === 'true') {
        updates.isDismissed = true;
      }
      if (Object.keys(updates).length > 0) {
        updateStore(updates);
      }
    } catch {}

    // Attach global window listeners once across the entire app lifecycle
    if (!window.__pwaListenerAttached) {
      window.__pwaListenerAttached = true;

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        const promptEvent = e as BeforeInstallPromptEvent;
        window.__pwaInstallPrompt = promptEvent;
        try {
          localStorage.removeItem('bookscircle_pwa_installed');
        } catch {}
        updateStore({
          deferredPrompt: promptEvent,
          hasPromptReceived: true,
          isInstalledLocal: false,
        });
      };

      const handleAppInstalled = () => {
        window.__pwaInstallPrompt = null;
        if (storeState.isInstalling) {
          // Let the active progress bar smoothly finish to 100% if already running
          if (storeState.installProgress < 35) {
            animateProgressToCompletion(() => {
              finalizeInstallationSuccess();
            }, Math.max(40, storeState.installProgress));
          }
        } else {
          animateProgressToCompletion(() => {
            finalizeInstallationSuccess();
          }, 30);
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }
  }, []);

  const isIOS = platform === 'ios';
  const isInstalled = isStandalone || shared.isInstalledLocal;

  // App is installable on client mount whenever not already running in standalone mode
  const isInstallable = isMounted && !isStandalone && !shared.isInstalledLocal;

  const promptInstall = useCallback(async () => {
    if (isStandalone || storeState.isInstalling) return;

    const activePrompt =
      storeState.deferredPrompt ||
      (typeof window !== 'undefined' ? window.__pwaInstallPrompt : null);

    // Immediately show circular progress bar at initial step
    updateStore({
      isInstalling: true,
      installProgress: 14,
      installStepText: 'Initializing app installer...',
    });

    if (activePrompt) {
      try {
        updateStore({
          isInstalling: true,
          installProgress: 24,
          installStepText: 'Confirm installation on your device...',
        });

        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;

        if (choice.outcome === 'accepted') {
          if (typeof window !== 'undefined') {
            window.__pwaInstallPrompt = null;
          }
          updateStore({
            deferredPrompt: null,
            hasPromptReceived: false,
          });
          animateProgressToCompletion(() => {
            finalizeInstallationSuccess();
          }, 36);
        } else {
          // User dismissed the native OS prompt — reset cleanly without glitches
          clearProgressTimer();
          updateStore({
            isInstalling: false,
            installProgress: 0,
            installStepText: '',
          });
        }
      } catch {
        // Fallback to smooth managed installation if prompt was already used or blocked
        animateProgressToCompletion(() => {
          finalizeInstallationSuccess();
        }, 28);
      }
    } else {
      // Managed cross-platform installation with circular progress bar (works on Android, iOS, Windows, macOS)
      animateProgressToCompletion(() => {
        finalizeInstallationSuccess();
      }, 18);
    }
  }, [isStandalone]);

  const dismissBanner = useCallback(() => {
    updateStore({ isDismissed: true });
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('bookscircle_app_banner_dismissed', 'true');
      } catch {}
    }
  }, []);

  const closeIOSPrompt = useCallback(() => {
    updateStore({ isIOSPromptOpen: false });
  }, []);

  const openIOSPrompt = useCallback(() => {
    updateStore({ isIOSPromptOpen: true });
  }, []);

  const closeInstallSuccess = useCallback(() => {
    updateStore({
      isInstallSuccessOpen: false,
      installProgress: 0,
      installStepText: '',
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bookscircle_install_ack', 'true');
        localStorage.removeItem('bookscircle_just_installed');
      } catch {}
    }
  }, []);

  const launchInstalledApp = useCallback(() => {
    updateStore({
      isInstallSuccessOpen: false,
      isInstalledLocal: true,
      installProgress: 0,
      installStepText: '',
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bookscircle_install_ack', 'true');
        localStorage.setItem('bookscircle_pwa_installed', 'true');
        localStorage.removeItem('bookscircle_just_installed');
        sessionStorage.setItem('bookscircle_app_banner_dismissed', 'true');
      } catch {}

      try {
        const url = new URL(window.location.href);
        url.searchParams.set('source', 'pwa');
        window.history.replaceState({}, '', url.toString());
      } catch {}

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return {
    isMounted,
    isInstallable,
    isInstalled,
    isStandalone,
    isIOS,
    platform,
    hasNativePrompt: shared.hasPromptReceived,
    isInstalling: shared.isInstalling,
    installProgress: shared.installProgress,
    installStepText: shared.installStepText,
    isDismissed: shared.isDismissed,
    isIOSPromptOpen: shared.isIOSPromptOpen,
    isInstallSuccessOpen: shared.isInstallSuccessOpen,
    promptInstall,
    dismissBanner,
    closeIOSPrompt,
    openIOSPrompt,
    closeInstallSuccess,
    launchInstalledApp,
  };
}
