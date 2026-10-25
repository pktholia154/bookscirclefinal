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

export type DevicePlatform =
  | 'android'
  | 'ios'
  | 'windows'
  | 'mac'
  | 'linux'
  | 'chromeos'
  | 'desktop';

export type InstallMechanism =
  | 'chromium-native'
  | 'ios-manual'
  | 'ios-legacy-non-safari'
  | 'macos-safari'
  | 'android-firefox'
  | 'desktop-firefox'
  | 'in-app-webview';

export type PWAInstallMachineState =
  | 'RUNNING_STANDALONE'
  | 'INSTALLED_ON_DEVICE'
  | 'NATIVE_PROMPT_READY'
  | 'IDLE_ELIGIBLE'
  | 'AWAITING_USER_CHOICE'
  | 'OS_HANDOFF_IN_PROGRESS'
  | 'INSTALLED_VERIFIED'
  | 'PROMPT_DISMISSED'
  | 'UNSUPPORTED_BROWSER';

export interface InstallEnvironment {
  platform: DevicePlatform;
  mechanism: InstallMechanism;
  browserName: string;
  isInAppWebView: boolean;
  isDesktopFirefox: boolean;
  isMacOSSafari: boolean;
  isAndroidFirefox: boolean;
  isIOSLegacyNonSafari: boolean;
  iosMajorVersion: number | null;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
    __pwaAppInstalled?: boolean;
    __pwaListenerAttached?: boolean;
  }
}

const DISMISS_COOLDOWN_KEY = 'bookscircle_pwa_dismissed_until';
const DISMISS_SESSION_KEY = 'bookscircle_app_banner_dismissed';
const INSTALLED_ON_DEVICE_KEY = 'bookscircle_installed_on_device';
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 6; // 6 hours cooldown after user dismisses native prompt

interface PWAStoreState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  hasPromptReceived: boolean;
  machineState: PWAInstallMachineState;
  isInstalling: boolean;
  isLaunching: boolean;
  installStepText: string;
  isIOSPromptOpen: boolean;
  isInstallSuccessOpen: boolean;
  isInstalledOnDevice: boolean;
  isInstalledVerified: boolean;
  isDismissed: boolean;
  isInIframe: boolean;
}

const initialStoreState: PWAStoreState = {
  deferredPrompt: null,
  hasPromptReceived: false,
  machineState: 'IDLE_ELIGIBLE',
  isInstalling: false,
  isLaunching: false,
  installStepText: '',
  isIOSPromptOpen: false,
  isInstallSuccessOpen: false,
  isInstalledOnDevice: false,
  isInstalledVerified: false,
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
// Listens in real time for immediate desktop window reparenting (Windows, macOS, Linux, ChromeOS)
function subscribeToDisplayMode(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
  const minimalUiQuery = window.matchMedia('(display-mode: minimal-ui)');
  const wcoQuery = window.matchMedia('(display-mode: window-controls-overlay)');

  const handleDisplayChange = () => {
    if (getDisplayModeSnapshot()) {
      window.__pwaAppInstalled = true;
      updateStore({
        machineState: 'RUNNING_STANDALONE',
        isInstalling: false,
        installStepText: '',
        isInstalledOnDevice: true,
        isInstalledVerified: true,
        isIOSPromptOpen: false,
      });
    }
    callback();
  };

  standaloneQuery.addEventListener('change', handleDisplayChange);
  fullscreenQuery.addEventListener('change', handleDisplayChange);
  minimalUiQuery.addEventListener('change', handleDisplayChange);
  wcoQuery.addEventListener('change', handleDisplayChange);
  window.addEventListener('appinstalled', callback);

  return () => {
    standaloneQuery.removeEventListener('change', handleDisplayChange);
    fullscreenQuery.removeEventListener('change', handleDisplayChange);
    minimalUiQuery.removeEventListener('change', handleDisplayChange);
    wcoQuery.removeEventListener('change', handleDisplayChange);
    window.removeEventListener('appinstalled', callback);
  };
}

export function getDisplayModeSnapshot(): boolean {
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

export function detectInstallEnvironment(): InstallEnvironment {
  if (typeof window === 'undefined') {
    return {
      platform: 'desktop',
      mechanism: 'chromium-native',
      browserName: 'Browser',
      isInAppWebView: false,
      isDesktopFirefox: false,
      isMacOSSafari: false,
      isAndroidFirefox: false,
      isIOSLegacyNonSafari: false,
      iosMajorVersion: null,
    };
  }

  const ua = window.navigator.userAgent || '';
  const uaLower = ua.toLowerCase();
  const isIPadOS =
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;

  // 1. Detect OS Platform
  let platform: DevicePlatform = 'desktop';
  if (/iphone|ipad|ipod/.test(uaLower) || isIPadOS) {
    platform = 'ios';
  } else if (/android/.test(uaLower)) {
    platform = 'android';
  } else if (/cros/.test(uaLower)) {
    platform = 'chromeos';
  } else if (/win/.test(uaLower)) {
    platform = 'windows';
  } else if (/mac/.test(uaLower)) {
    platform = 'mac';
  } else if (/linux|x11/.test(uaLower)) {
    platform = 'linux';
  }

  // 2. Detect Sandboxed In-App WebViews (Instagram, Facebook, LinkedIn, WhatsApp, X/Twitter, TikTok, WeChat, Line, generic wv)
  const isInAppWebView =
    /instagram|fban|fbav|fb_iab|linkedinapp|whatsapp|twitter|bytedancewebview|musical_ly|micromessenger|line\/|snapchat/.test(
      uaLower
    ) ||
    (platform === 'android' && /; wv\)/.test(uaLower));

  // 3. Detect iOS version & browser engine
  let iosMajorVersion: number | null = null;
  if (platform === 'ios') {
    const match = ua.match(/OS (\d+)_(\d+)/i) || ua.match(/Version\/(\d+)\.(\d+)/i);
    if (match && match[1]) {
      iosMajorVersion = parseInt(match[1], 10);
    }
  }

  const isIOSNonSafari =
    platform === 'ios' && /crios|edgios|fxios|opios|brave/i.test(uaLower);
  const isIOSLegacyNonSafari =
    isIOSNonSafari && iosMajorVersion !== null && iosMajorVersion < 16;

  // 4. Detect Firefox (Android vs Desktop)
  const isFirefox = /firefox|fxios/i.test(uaLower) && !/seamonkey/i.test(uaLower);
  const isAndroidFirefox = platform === 'android' && isFirefox;
  const isDesktopFirefox =
    (platform === 'windows' ||
      platform === 'mac' ||
      platform === 'linux' ||
      platform === 'desktop') &&
    isFirefox;

  // 5. Detect macOS Safari (Sonoma+ supports File -> Add to Dock)
  const isSafariEngine =
    /safari/i.test(uaLower) &&
    !/chrome|chromium|crios|edg|edgios|opr|opios|brave|fxios|firefox|samsungbrowser/i.test(
      uaLower
    );
  const isMacOSSafari = platform === 'mac' && isSafariEngine;

  // 6. Friendly Browser Name
  let browserName = 'Browser';
  if (isInAppWebView) browserName = 'In-App Browser';
  else if (/edg|edgios/i.test(uaLower)) browserName = 'Microsoft Edge';
  else if (/samsungbrowser/i.test(uaLower)) browserName = 'Samsung Internet';
  else if (/opr|opios/i.test(uaLower)) browserName = 'Opera';
  else if (/brave/i.test(uaLower)) browserName = 'Brave';
  else if (/chrome|chromium|crios/i.test(uaLower)) browserName = 'Chrome';
  else if (isFirefox) browserName = 'Firefox';
  else if (isSafariEngine) browserName = 'Safari';

  // 7. Determine exact Installation Mechanism per Section 3 Matrix
  let mechanism: InstallMechanism = 'chromium-native';
  if (isInAppWebView) {
    mechanism = 'in-app-webview';
  } else if (isDesktopFirefox) {
    mechanism = 'desktop-firefox';
  } else if (isAndroidFirefox) {
    mechanism = 'android-firefox';
  } else if (isMacOSSafari) {
    mechanism = 'macos-safari';
  } else if (isIOSLegacyNonSafari) {
    mechanism = 'ios-legacy-non-safari';
  } else if (platform === 'ios') {
    mechanism = 'ios-manual';
  } else {
    mechanism = 'chromium-native';
  }

  return {
    platform,
    mechanism,
    browserName,
    isInAppWebView,
    isDesktopFirefox,
    isMacOSSafari,
    isAndroidFirefox,
    isIOSLegacyNonSafari,
    iosMajorVersion,
  };
}

export function detectDevicePlatform(): DevicePlatform {
  return detectInstallEnvironment().platform;
}

/**
 * Waits briefly if `beforeinstallprompt` is just about to fire after SW registration.
 */
function waitForNativePromptEvent(timeoutMs = 600): Promise<BeforeInstallPromptEvent | null> {
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
      updateStore({
        deferredPrompt: promptEv,
        hasPromptReceived: true,
        machineState: 'NATIVE_PROMPT_READY',
      });
      finish(promptEv);
    };

    const onCustomPrompt = () => {
      if (window.__pwaInstallPrompt) {
        updateStore({
          deferredPrompt: window.__pwaInstallPrompt,
          hasPromptReceived: true,
          machineState: 'NATIVE_PROMPT_READY',
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
 * Waits for genuine OS verification (`appinstalled` event or `display-mode: standalone` change).
 * Never fakes success on timeout!
 */
function waitForVerifiedOSInstall(timeoutMs = 12000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.__pwaAppInstalled || getDisplayModeSnapshot()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    const standaloneMql = window.matchMedia('(display-mode: standalone)');
    const wcoMql = window.matchMedia('(display-mode: window-controls-overlay)');

    const finish = (verified: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('appinstalled', onVerified);
      window.removeEventListener('bookscircle:pwa-installed', onVerified);
      standaloneMql.removeEventListener('change', onDisplayChange);
      wcoMql.removeEventListener('change', onDisplayChange);
      clearTimeout(timer);
      resolve(verified);
    };

    const onVerified = () => {
      window.__pwaAppInstalled = true;
      finish(true);
    };

    const onDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        window.__pwaAppInstalled = true;
        finish(true);
      }
    };

    window.addEventListener('appinstalled', onVerified);
    window.addEventListener('bookscircle:pwa-installed', onVerified);
    standaloneMql.addEventListener('change', onDisplayChange);
    wcoMql.addEventListener('change', onDisplayChange);

    // If WebAPK minting takes longer than timeoutMs in background, resolve false for now;
    // the global `appinstalled` listener will still catch it when the OS completes!
    const timer = setTimeout(() => {
      finish(Boolean(window.__pwaAppInstalled || getDisplayModeSnapshot()));
    }, timeoutMs);
  });
}

/**
 * Non-blocking background synchronization of live catalog & persistent storage.
 */
async function syncLiveCatalogInBackground(): Promise<void> {
  try {
    await flushAllAppCachesAndStorage();
    await Promise.allSettled([
      getBooksFromFirestore(true),
      getCategoriesFromFirestore(true),
      requestPersistentStorage(),
    ]);
  } catch {}
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
  const [env, setEnv] = useState<InstallEnvironment>(() => ({
    platform: 'desktop',
    mechanism: 'chromium-native',
    browserName: 'Browser',
    isInAppWebView: false,
    isDesktopFirefox: false,
    isMacOSSafari: false,
    isAndroidFirefox: false,
    isIOSLegacyNonSafari: false,
    iosMajorVersion: null,
  }));

  useEffect(() => {
    setIsMounted(true);
    const detectedEnv = detectInstallEnvironment();
    setEnv(detectedEnv);

    if (typeof window === 'undefined') return;

    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    // 1. Evaluate Standalone Mode immediately
    if (getDisplayModeSnapshot()) {
      updateStore({
        machineState: 'RUNNING_STANDALONE',
        isInIframe: inIframe,
        isInstalledOnDevice: true,
        isInstalledVerified: true,
      });
      return;
    }

    // 2. Evaluate Unsupported Desktop Firefox (Section 3 Matrix: Do not show fake install buttons)
    if (detectedEnv.isDesktopFirefox) {
      updateStore({
        machineState: 'UNSUPPORTED_BROWSER',
        isInIframe: inIframe,
      });
    }

    // 3. Sync any globally captured `beforeinstallprompt` from layout.tsx inline script
    const existingPrompt = window.__pwaInstallPrompt || storeState.deferredPrompt;
    if (existingPrompt) {
      updateStore({
        deferredPrompt: existingPrompt,
        hasPromptReceived: true,
        machineState: 'NATIVE_PROMPT_READY',
        isInIframe: inIframe,
      });
    } else {
      updateStore({ isInIframe: inIframe });
    }

    // 4. Restore dismissal cooldown state
    try {
      const dismissedSession = sessionStorage.getItem(DISMISS_SESSION_KEY);
      const dismissedUntil = Number(localStorage.getItem(DISMISS_COOLDOWN_KEY) || '0');
      if (dismissedSession === 'true' || (dismissedUntil > 0 && Date.now() < dismissedUntil)) {
        updateStore({ isDismissed: true });
      }
    } catch {}

    // 5. Browser-Tab Duplicate Prevention via `navigator.getInstalledRelatedApps()` (Section 4.2.2)
    try {
      const nav = window.navigator as Navigator & {
        getInstalledRelatedApps?: () => Promise<
          Array<{ id?: string; platform?: string; url?: string }>
        >;
      };
      if (typeof nav.getInstalledRelatedApps === 'function') {
        nav
          .getInstalledRelatedApps()
          .then((apps) => {
            if (Array.isArray(apps) && apps.length > 0) {
              try {
                localStorage.setItem(INSTALLED_ON_DEVICE_KEY, 'true');
              } catch {}
              updateStore({
                isInstalledOnDevice: true,
                machineState: 'INSTALLED_ON_DEVICE',
              });
            }
          })
          .catch(() => {});
      }
    } catch {}

    // 6. Attach global window listeners once across the application lifecycle
    if (!window.__pwaListenerAttached) {
      window.__pwaListenerAttached = true;

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        const promptEvent = e as BeforeInstallPromptEvent;
        window.__pwaInstallPrompt = promptEvent;
        updateStore({
          deferredPrompt: promptEvent,
          hasPromptReceived: true,
          machineState: 'NATIVE_PROMPT_READY',
          isInstalledOnDevice: false,
        });
      };

      const handleCustomPromptReady = () => {
        if (window.__pwaInstallPrompt) {
          updateStore({
            deferredPrompt: window.__pwaInstallPrompt,
            hasPromptReceived: true,
            machineState: 'NATIVE_PROMPT_READY',
            isInstalledOnDevice: false,
          });
        }
      };

      const handleAppInstalled = () => {
        window.__pwaInstallPrompt = null;
        window.__pwaAppInstalled = true;
        try {
          localStorage.setItem(INSTALLED_ON_DEVICE_KEY, 'true');
        } catch {}

        syncLiveCatalogInBackground();

        updateStore({
          deferredPrompt: null,
          hasPromptReceived: false,
          machineState: 'INSTALLED_VERIFIED',
          isInstalling: false,
          installStepText: 'Installation verified by your operating system.',
          isInstalledOnDevice: true,
          isInstalledVerified: true,
          isInstallSuccessOpen: true,
          isIOSPromptOpen: false,
        });
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('bookscircle:pwa-prompt-ready', handleCustomPromptReady);
      window.addEventListener('appinstalled', handleAppInstalled);
    }
  }, []);

  const isIOS = env.platform === 'ios';
  const isInstalled = isStandalone || shared.isInstalledVerified;

  // Hide install triggers if running standalone OR on standard Firefox Desktop (which has no standalone PWA engine)
  const isInstallable =
    isMounted &&
    !isStandalone &&
    !shared.isInstalledVerified &&
    !env.isDesktopFirefox;

  /**
   * Deterministic Event-Synchronized Installation Trigger (Section 4.1 & 4.2):
   * - ZERO fake percentage bars.
   * - If `INSTALLED_ON_DEVICE`: opens the installed app directly (`/?source=pwa`).
   * - If `beforeinstallprompt` is available:
   *   1. Transitions to `AWAITING_USER_CHOICE` ("Waiting for confirmation in the browser dialog...")
   *   2. If `outcome === 'dismissed'`: immediately resets to `PROMPT_DISMISSED` with cooldown and stops spinner.
   *   3. If `outcome === 'accepted'`: transitions to `OS_HANDOFF_IN_PROGRESS` ("Finalizing installation with your operating system...")
   *      and waits for genuine `appinstalled` or `display-mode: standalone` transition before showing `INSTALLED_VERIFIED`.
   * - If manual platform (iOS, macOS Safari, Android Firefox, In-App WebView, or preview iframe):
   *   Opens the platform-accurate instruction modal WITHOUT ever claiming "Installation Successful".
   */
  const promptInstall = useCallback(async () => {
    if (isStandalone || storeState.isInstalling) return;

    // If already detected as installed on device via getInstalledRelatedApps(), launch directly
    if (storeState.isInstalledOnDevice && !storeState.deferredPrompt) {
      const targetUrl = `${window.location.origin}/?source=pwa`;
      window.location.assign(targetUrl);
      return;
    }

    const currentEnv = detectInstallEnvironment();

    // Route manual platforms and sandboxed WebViews directly to the accurate platform guide
    if (
      currentEnv.mechanism === 'in-app-webview' ||
      currentEnv.mechanism === 'ios-manual' ||
      currentEnv.mechanism === 'ios-legacy-non-safari' ||
      currentEnv.mechanism === 'macos-safari' ||
      currentEnv.mechanism === 'android-firefox'
    ) {
      updateStore({
        isInstalling: false,
        installStepText: '',
        isIOSPromptOpen: true,
      });
      return;
    }

    if (currentEnv.mechanism === 'desktop-firefox') {
      return;
    }

    // Ensure Service Worker is registered for Chromium installability
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
      } catch {}
    }

    // Check for captured `beforeinstallprompt` event
    const activePrompt = await waitForNativePromptEvent(500);

    if (activePrompt) {
      try {
        // STATE 1: AWAITING_USER_CHOICE (Indeterminate spinner)
        updateStore({
          machineState: 'AWAITING_USER_CHOICE',
          isInstalling: true,
          installStepText: 'Waiting for confirmation in the browser dialog...',
        });

        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;

        // Clear consumed prompt reference immediately per Chromium spec
        if (typeof window !== 'undefined') {
          window.__pwaInstallPrompt = null;
        }

        if (choice.outcome === 'accepted') {
          // STATE 2: OS_HANDOFF_IN_PROGRESS (Indeterminate spinner while OS compiles WebAPK / reparents window)
          updateStore({
            deferredPrompt: null,
            hasPromptReceived: false,
            machineState: 'OS_HANDOFF_IN_PROGRESS',
            isInstalling: true,
            installStepText: 'Finalizing installation with your operating system...',
          });

          syncLiveCatalogInBackground();

          const verified = await waitForVerifiedOSInstall(12000);
          if (verified) {
            try {
              localStorage.setItem(INSTALLED_ON_DEVICE_KEY, 'true');
            } catch {}
            updateStore({
              machineState: 'INSTALLED_VERIFIED',
              isInstalling: false,
              installStepText: 'Installation verified by your operating system.',
              isInstalledOnDevice: true,
              isInstalledVerified: true,
              isInstallSuccessOpen: true,
            });
          } else {
            // OS WebAPK compilation is still finishing in the background; global `appinstalled` listener will catch it
            updateStore({
              machineState: 'OS_HANDOFF_IN_PROGRESS',
              isInstalling: false,
              installStepText: 'Completing background OS installation...',
            });
          }
        } else {
          // STATE 3: PROMPT_DISMISSED — Stop all loading indicators immediately & apply dismissal cooldown
          try {
            localStorage.setItem(
              DISMISS_COOLDOWN_KEY,
              String(Date.now() + DISMISS_COOLDOWN_MS)
            );
          } catch {}
          updateStore({
            deferredPrompt: null,
            hasPromptReceived: false,
            machineState: 'PROMPT_DISMISSED',
            isInstalling: false,
            installStepText: '',
          });
        }
      } catch {
        // Native prompt invocation failed — reset spinner and show manual guide
        updateStore({
          deferredPrompt: null,
          hasPromptReceived: false,
          machineState: 'IDLE_ELIGIBLE',
          isInstalling: false,
          installStepText: '',
          isIOSPromptOpen: true,
        });
      }
    } else {
      // No `beforeinstallprompt` available (e.g., preview iframe or already installed) -> show manual guide without faking install
      updateStore({
        isInstalling: false,
        installStepText: '',
        isIOSPromptOpen: true,
      });
    }
  }, [isStandalone]);

  const dismissBanner = useCallback(() => {
    updateStore({ isDismissed: true, machineState: 'PROMPT_DISMISSED' });
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(DISMISS_SESSION_KEY, 'true');
        localStorage.setItem(
          DISMISS_COOLDOWN_KEY,
          String(Date.now() + DISMISS_COOLDOWN_MS)
        );
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
      installStepText: '',
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bookscircle_install_ack', 'true');
      } catch {}
    }
  }, []);

  /**
   * Opens / focuses the installed PWA via the manifest `start_url` (`/?source=pwa`),
   * triggering Android Declarative Link Capturing or desktop `launch_handler` window focus.
   */
  const launchInstalledApp = useCallback(async () => {
    if (storeState.isLaunching) return;

    updateStore({
      isLaunching: true,
      installStepText: 'Opening BooksCircle App...',
    });

    try {
      await flushAllAppCachesAndStorage();
    } catch {}

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bookscircle_install_ack', 'true');
        sessionStorage.setItem(DISMISS_SESSION_KEY, 'true');
      } catch {}

      const targetUrl = `${window.location.origin}/?source=pwa`;
      window.location.assign(targetUrl);
    }
  }, []);

  return {
    isMounted,
    isInstallable,
    isInstalled,
    isInstalledOnDevice: shared.isInstalledOnDevice,
    isInstalledVerified: shared.isInstalledVerified,
    isStandalone,
    isIOS,
    platform: env.platform,
    environment: env,
    machineState: isStandalone ? 'RUNNING_STANDALONE' : shared.machineState,
    isInIframe: shared.isInIframe,
    hasNativePrompt: shared.hasPromptReceived,
    isInstalling: shared.isInstalling,
    isLaunching: shared.isLaunching,
    // Kept as 0 for backward compatibility; UI now uses strict indeterminate spinners per Section 4.1
    installProgress: 0,
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
