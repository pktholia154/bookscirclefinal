'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { requestPersistentStorage } from '@/lib/offline-storage';
import {
  flushAllAppCachesAndStorage,
  getBooksFromFirestore,
  getCategoriesFromFirestore,
} from '@/lib/services/books';

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
    __pwaAppInstalled?: boolean;
    __pwaListenerAttached?: boolean;
  }
}

interface PWAStoreState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  hasPromptReceived: boolean;
  isInstalling: boolean;
  isLaunching: boolean;
  installProgress: number;
  installStepText: string;
  isIOSPromptOpen: boolean;
  isInstallSuccessOpen: boolean;
  isInstalledConfirmed: boolean;
  isDismissed: boolean;
  isInIframe: boolean;
}

const initialStoreState: PWAStoreState = {
  deferredPrompt: null,
  hasPromptReceived: false,
  isInstalling: false,
  isLaunching: false,
  installProgress: 0,
  installStepText: '',
  isIOSPromptOpen: false,
  isInstallSuccessOpen: false,
  isInstalledConfirmed: false,
  isDismissed: false,
  isInIframe: false,
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

/**
 * Waits up to `timeoutMs` for the browser to fire `beforeinstallprompt`
 * (e.g. right after Service Worker registration completes).
 */
function waitForNativePromptEvent(timeoutMs = 1400): Promise<BeforeInstallPromptEvent | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (storeState.deferredPrompt) return Promise.resolve(storeState.deferredPrompt);
  if (window.__pwaInstallPrompt) return Promise.resolve(window.__pwaInstallPrompt);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ev: BeforeInstallPromptEvent | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('bookscircle:pwa-prompt-ready', onCustomPrompt);
      clearTimeout(timer);
      resolve(ev);
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      const promptEv = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = promptEv;
      updateStore({ deferredPrompt: promptEv, hasPromptReceived: true });
      finish(promptEv);
    };

    const onCustomPrompt = () => {
      if (window.__pwaInstallPrompt) {
        updateStore({
          deferredPrompt: window.__pwaInstallPrompt,
          hasPromptReceived: true,
        });
        finish(window.__pwaInstallPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('bookscircle:pwa-prompt-ready', onCustomPrompt);

    const timer = setTimeout(() => {
      finish(storeState.deferredPrompt || window.__pwaInstallPrompt || null);
    }, timeoutMs);
  });
}

/**
 * Waits for the OS `appinstalled` event after the user accepts the native prompt,
 * with a fallback timeout in case the browser already fired it or runs WebAPK minting silently.
 */
function waitForOSAppInstalled(timeoutMs = 6000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.__pwaAppInstalled || getDisplayModeSnapshot()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (installed: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('bookscircle:pwa-installed', onInstalled);
      clearTimeout(timer);
      resolve(installed);
    };

    const onInstalled = () => {
      window.__pwaAppInstalled = true;
      finish(true);
    };

    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('bookscircle:pwa-installed', onInstalled);

    const timer = setTimeout(() => {
      finish(true);
    }, timeoutMs);
  });
}

/**
 * Real multi-step synchronization that flushes stale caches and pulls fresh live
 * books & categories from Firestore while updating the real progress bar.
 */
async function executeRealCacheFlushAndFirestoreSync(
  onProgress: (pct: number, stepText: string) => void
): Promise<void> {
  onProgress(55, 'Flushing old caches & stale storage...');
  await flushAllAppCachesAndStorage();

  onProgress(70, 'Syncing live books & categories from Firestore...');
  await Promise.allSettled([
    getBooksFromFirestore(true),
    getCategoriesFromFirestore(true),
    requestPersistentStorage(),
  ]);

  onProgress(90, 'Verifying active Service Worker & offline reader...');
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await reg.update().catch(() => {});
    } catch {}
  }
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

    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    // Sync any globally captured prompt from layout.tsx inline bootstrap script
    const existingPrompt = window.__pwaInstallPrompt || storeState.deferredPrompt;
    if (existingPrompt) {
      updateStore({
        deferredPrompt: existingPrompt,
        hasPromptReceived: true,
        isInIframe: inIframe,
      });
    } else {
      updateStore({ isInIframe: inIframe });
    }

    // Check if OS already has related installed PWA (supported on Android Chrome / Windows Edge)
    try {
      const nav = window.navigator as Navigator & {
        getInstalledRelatedApps?: () => Promise<Array<{ id?: string; platform?: string; url?: string }>>;
      };
      if (typeof nav.getInstalledRelatedApps === 'function') {
        nav
          .getInstalledRelatedApps()
          .then((apps) => {
            if (Array.isArray(apps) && apps.length > 0) {
              updateStore({ isInstalledConfirmed: true });
            }
          })
          .catch(() => {});
      }
    } catch {}

    // Restore session dismissal state
    try {
      const dismissedFlag = sessionStorage.getItem('bookscircle_app_banner_dismissed');
      if (dismissedFlag === 'true') {
        updateStore({ isDismissed: true });
      }
    } catch {}

    // Attach global window listeners once across the entire app lifecycle
    if (!window.__pwaListenerAttached) {
      window.__pwaListenerAttached = true;

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        const promptEvent = e as BeforeInstallPromptEvent;
        window.__pwaInstallPrompt = promptEvent;
        updateStore({
          deferredPrompt: promptEvent,
          hasPromptReceived: true,
          isInstalledConfirmed: false,
        });
      };

      const handleCustomPromptReady = () => {
        if (window.__pwaInstallPrompt) {
          updateStore({
            deferredPrompt: window.__pwaInstallPrompt,
            hasPromptReceived: true,
            isInstalledConfirmed: false,
          });
        }
      };

      const handleAppInstalled = async () => {
        window.__pwaInstallPrompt = null;
        window.__pwaAppInstalled = true;

        // If OS triggered appinstalled (e.g. from browser menu or after prompt), run real cache flush & live sync
        if (!storeState.isInstalling && !storeState.isInstallSuccessOpen) {
          updateStore({
            isInstalling: true,
            installProgress: 50,
            installStepText: 'OS installation detected — syncing live data...',
          });
          await executeRealCacheFlushAndFirestoreSync((pct, stepText) => {
            updateStore({
              isInstalling: true,
              installProgress: pct,
              installStepText: stepText,
            });
          });
        }

        updateStore({
          deferredPrompt: null,
          hasPromptReceived: false,
          isInstalling: false,
          installProgress: 100,
          installStepText: 'App installed & synced!',
          isInstalledConfirmed: true,
          isInstallSuccessOpen: true,
        });
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('bookscircle:pwa-prompt-ready', handleCustomPromptReady);
      window.addEventListener('appinstalled', handleAppInstalled);
    }
  }, []);

  const isIOS = platform === 'ios';
  const isInstalled = isStandalone || shared.isInstalledConfirmed;

  // App is installable on client mount whenever not already running in standalone mode
  const isInstallable = isMounted && !isStandalone && !shared.isInstalledConfirmed;

  /**
   * Real Installation Trigger:
   * 1. Verifies Service Worker registration (0% -> 20%)
   * 2. Awaits real `beforeinstallprompt` and triggers OS dialog (20% -> 45%)
   * 3. If accepted: flushes all stale caches, fetches fresh Firestore catalog, and awaits OS `appinstalled` event (45% -> 100%)
   * 4. If native prompt is unavailable (e.g., iOS Safari or embedded iframe): flushes stale cache & opens real device instruction modal without faking installation!
   */
  const promptInstall = useCallback(async () => {
    if (isStandalone || storeState.isInstalling) return;

    // Step 1: Real Service Worker & Manifest verification
    updateStore({
      isInstalling: true,
      installProgress: 15,
      installStepText: 'Verifying Service Worker & Web App Manifest...',
    });

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((r) => setTimeout(r, 1500)),
        ]);
      } catch {}
    }

    updateStore({
      isInstalling: true,
      installProgress: 28,
      installStepText: 'Checking device Home Screen installer...',
    });

    // Step 2: Check for real native `beforeinstallprompt` event
    const activePrompt = await waitForNativePromptEvent(900);

    if (activePrompt) {
      try {
        updateStore({
          isInstalling: true,
          installProgress: 40,
          installStepText: 'Confirm installation in your device dialog...',
        });

        // Trigger the REAL OS installation prompt
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;

        if (choice.outcome === 'accepted') {
          if (typeof window !== 'undefined') {
            window.__pwaInstallPrompt = null;
          }
          updateStore({
            deferredPrompt: null,
            hasPromptReceived: false,
            isInstalling: true,
            installProgress: 55,
            installStepText: 'Installing on device & flushing stale cache...',
          });

          // Run real cache flush + live Firestore sync AND wait for OS appinstalled handshake in parallel
          await Promise.all([
            executeRealCacheFlushAndFirestoreSync((pct, stepText) => {
              updateStore({
                isInstalling: true,
                installProgress: pct,
                installStepText: stepText,
              });
            }),
            waitForOSAppInstalled(4500),
          ]);

          updateStore({
            isInstalling: false,
            installProgress: 100,
            installStepText: 'Installed & synced with live catalog!',
            isInstalledConfirmed: true,
            isInstallSuccessOpen: true,
          });
        } else {
          // User cancelled/dismissed the OS dialog — abort immediately, NEVER show fake install!
          updateStore({
            isInstalling: false,
            installProgress: 0,
            installStepText: '',
          });
        }
      } catch {
        // Prompt could not be invoked — reset and show real device guide
        updateStore({
          isInstalling: false,
          installProgress: 0,
          installStepText: '',
          isIOSPromptOpen: true,
        });
      }
    } else {
      // Native `beforeinstallprompt` is not supported in this context (e.g. iOS Safari, or inside preview iframe, or already installed).
      // Still flush stale cache & sync live data so the user never sees old demo data, then open the honest Device Install Guide modal!
      await executeRealCacheFlushAndFirestoreSync((pct, stepText) => {
        updateStore({
          isInstalling: true,
          installProgress: pct,
          installStepText: stepText,
        });
      });

      updateStore({
        isInstalling: false,
        installProgress: 0,
        installStepText: '',
        isIOSPromptOpen: true,
      });
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

  /**
   * Real Launch & Hard-Sync Action:
   * Flushes all stale local/SW caches, fetches fresh live data, and performs a hard reload
   * to `/?source=pwa&_sync=<timestamp>` so the launched app is 100% in sync with live Firestore.
   */
  const launchInstalledApp = useCallback(async () => {
    if (storeState.isLaunching) return;

    updateStore({
      isLaunching: true,
      installStepText: 'Flushing cache & launching live synced app...',
    });

    try {
      await flushAllAppCachesAndStorage();
    } catch {}

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bookscircle_install_ack', 'true');
        localStorage.removeItem('bookscircle_just_installed');
        sessionStorage.setItem('bookscircle_app_banner_dismissed', 'true');
      } catch {}

      const targetUrl = `${window.location.origin}/?source=pwa&_sync=${Date.now()}`;
      window.location.replace(targetUrl);
    }
  }, []);

  return {
    isMounted,
    isInstallable,
    isInstalled,
    isStandalone,
    isIOS,
    platform,
    isInIframe: shared.isInIframe,
    hasNativePrompt: shared.hasPromptReceived,
    isInstalling: shared.isInstalling,
    isLaunching: shared.isLaunching,
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
