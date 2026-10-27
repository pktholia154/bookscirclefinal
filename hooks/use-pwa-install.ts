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

export type IOSBrowserType =
  | 'safari'
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'brave'
  | 'opera'
  | 'webview'
  | 'other'
  | null;

export type IOSPointerPosition =
  | 'top-right'
  | 'bottom-center'
  | 'bottom-right'
  | 'top-left';

export type ScreenOrientationType = 'portrait' | 'landscape';

export type InstallMechanism =
  | 'chromium-native'
  | 'ios-manual'
  | 'ios-legacy-non-safari'
  | 'macos-safari'
  | 'android-firefox'
  | 'desktop-firefox'
  | 'in-app-webview';

export type PWAInstallUIMode =
  | 'hidden-standalone'
  | 'ios-smart-pointer'
  | 'native-install'
  | 'browser-fallback'
  | 'unsupported';

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
  iosBrowser: IOSBrowserType;
  isIPad: boolean;
  isInAppWebView: boolean;
  isDesktopFirefox: boolean;
  isMacOSSafari: boolean;
  isAndroidFirefox: boolean;
  isIOSLegacyNonSafari: boolean;
  isIOSChrome: boolean;
  isIOSSafari: boolean;
  isIOSEdge: boolean;
  isIOSFirefox: boolean;
  isChromiumCapable: boolean;
  iosMajorVersion: number | null;
  defaultIOSPointerPosition: IOSPointerPosition;
}

export interface ViewportMetrics {
  width: number;
  height: number;
  orientation: ScreenOrientationType;
  isCompactHeight: boolean;
  safariToolbarLayout: 'bottom' | 'top';
}

export async function forceHardFlushAndReloadApp(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((k) => caches.delete(k)));
    }
  } catch {}
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((r) => r.unregister()));
    }
  } catch {}
  try {
    sessionStorage.clear();
    localStorage.removeItem('bookscircle_live_books_v3');
    localStorage.removeItem('bookscircle_live_categories_v3');
    localStorage.removeItem('bookscircle_sold_counts_v3');
    localStorage.removeItem('bookscircle_app_banner_dismissed');
    localStorage.removeItem('bookscircle_pwa_dismissed_until');
    localStorage.removeItem('bookscircle_ios_pointer_dismissed');
    localStorage.setItem('bookscircle_app_build', '2026.10.25.v18');
  } catch {}
  window.location.replace(`${window.location.pathname}?_flush=${Date.now()}`);
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
const IOS_POINTER_DISMISS_KEY = 'bookscircle_ios_pointer_dismissed';
const IOS_POINTER_POS_KEY = 'bookscircle_ios_pointer_pos';
const INSTALLED_ON_DEVICE_KEY = 'bookscircle_installed_on_device';
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 6; // 6 hours cooldown

interface PWAStoreState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  hasPromptReceived: boolean;
  machineState: PWAInstallMachineState;
  isInstalling: boolean;
  isLaunching: boolean;
  installStepText: string;
  isIOSPromptOpen: boolean;
  isIOSPointerDismissed: boolean;
  iosPointerMinimized: boolean;
  manualIOSPointerPosition: IOSPointerPosition | null;
  showInlineFallbackHint: boolean;
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
  isIOSPointerDismissed: false,
  iosPointerMinimized: false,
  manualIOSPointerPosition: null,
  showInlineFallbackHint: false,
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
        showInlineFallbackHint: false,
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

export function detectViewportMetrics(): ViewportMetrics {
  if (typeof window === 'undefined') {
    return {
      width: 390,
      height: 844,
      orientation: 'portrait',
      isCompactHeight: false,
      safariToolbarLayout: 'bottom',
    };
  }

  const width = window.innerWidth || document.documentElement.clientWidth || 390;
  const height = window.innerHeight || document.documentElement.clientHeight || 844;
  const orientation: ScreenOrientationType = width > height ? 'landscape' : 'portrait';
  const isCompactHeight = height < 500;

  // Heuristic for Safari toolbar layout:
  // On iPad (width >= 768) or in landscape orientation, Safari places the unified address/share toolbar at the TOP.
  // On iPhone in portrait mode, iOS 15-18+ defaults to the bottom Tab Bar.
  const isIPadSize = width >= 768 || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const safariToolbarLayout: 'bottom' | 'top' =
    isIPadSize || orientation === 'landscape' ? 'top' : 'bottom';

  return {
    width,
    height,
    orientation,
    isCompactHeight,
    safariToolbarLayout,
  };
}

export function detectInstallEnvironment(): InstallEnvironment {
  if (typeof window === 'undefined') {
    return {
      platform: 'desktop',
      mechanism: 'chromium-native',
      browserName: 'Browser',
      iosBrowser: null,
      isIPad: false,
      isInAppWebView: false,
      isDesktopFirefox: false,
      isMacOSSafari: false,
      isAndroidFirefox: false,
      isIOSLegacyNonSafari: false,
      isIOSChrome: false,
      isIOSSafari: false,
      isIOSEdge: false,
      isIOSFirefox: false,
      isChromiumCapable: false,
      iosMajorVersion: null,
      defaultIOSPointerPosition: 'bottom-center',
    };
  }

  const ua = window.navigator.userAgent || '';
  const uaLower = ua.toLowerCase();
  const isIPadOS =
    /ipad/.test(uaLower) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

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

  // 2. Detect Sandboxed In-App WebViews
  const isInAppWebView =
    /instagram|fban|fbav|fb_iab|linkedinapp|whatsapp|twitter|bytedancewebview|musical_ly|micromessenger|line\/|snapchat/.test(
      uaLower
    ) ||
    (platform === 'android' && /; wv\)/.test(uaLower));

  // 3. Detect iOS version & specific iOS browser
  let iosMajorVersion: number | null = null;
  if (platform === 'ios') {
    const match = ua.match(/OS (\d+)_(\d+)/i) || ua.match(/Version\/(\d+)\.(\d+)/i);
    if (match && match[1]) {
      iosMajorVersion = parseInt(match[1], 10);
    }
  }

  const isIOSChrome = platform === 'ios' && /crios/i.test(uaLower);
  const isIOSEdge = platform === 'ios' && /edgios/i.test(uaLower);
  const isIOSFirefox = platform === 'ios' && /fxios/i.test(uaLower);
  const isIOSOpera = platform === 'ios' && /opios|opt\//i.test(uaLower);
  const isIOSBrave = platform === 'ios' && /brave/i.test(uaLower);

  const isSafariEngine =
    /safari/i.test(uaLower) &&
    !/chrome|chromium|crios|edg|edgios|opr|opios|opt\/|brave|fxios|firefox|samsungbrowser/i.test(
      uaLower
    );

  const isIOSSafari = platform === 'ios' && isSafariEngine && !isInAppWebView;
  const isIOSNonSafari =
    platform === 'ios' && (isIOSChrome || isIOSEdge || isIOSFirefox || isIOSOpera || isIOSBrave);
  const isIOSLegacyNonSafari =
    isIOSNonSafari && iosMajorVersion !== null && iosMajorVersion < 16;

  let iosBrowser: IOSBrowserType = null;
  if (platform === 'ios') {
    if (isInAppWebView) iosBrowser = 'webview';
    else if (isIOSChrome) iosBrowser = 'chrome';
    else if (isIOSSafari) iosBrowser = 'safari';
    else if (isIOSEdge) iosBrowser = 'edge';
    else if (isIOSFirefox) iosBrowser = 'firefox';
    else if (isIOSBrave) iosBrowser = 'brave';
    else if (isIOSOpera) iosBrowser = 'opera';
    else iosBrowser = 'other';
  }

  // 4. Detect Firefox & Safari on non-iOS
  const isFirefox = /firefox|fxios/i.test(uaLower) && !/seamonkey/i.test(uaLower);
  const isAndroidFirefox = platform === 'android' && isFirefox;
  const isDesktopFirefox =
    (platform === 'windows' ||
      platform === 'mac' ||
      platform === 'linux' ||
      platform === 'desktop') &&
    isFirefox;
  const isMacOSSafari = platform === 'mac' && isSafariEngine;

  // 5. Detect Chromium Native Install Capability ( strictly false on iOS )
  const isChromiumCapable =
    platform !== 'ios' &&
    !isInAppWebView &&
    !isFirefox &&
    !isMacOSSafari &&
    (/chrome|chromium|edg|opr|brave|samsungbrowser/i.test(uaLower) ||
      'onbeforeinstallprompt' in window);

  // 6. Friendly Browser Name
  let browserName = 'Browser';
  if (isInAppWebView) browserName = 'In-App Browser';
  else if (isIOSChrome) browserName = 'Chrome on iOS';
  else if (isIOSSafari) browserName = isIPadOS ? 'Safari on iPadOS' : 'Safari on iOS';
  else if (isIOSEdge) browserName = 'Edge on iOS';
  else if (isIOSFirefox) browserName = 'Firefox on iOS';
  else if (isIOSOpera) browserName = 'Opera on iOS';
  else if (isIOSBrave) browserName = 'Brave on iOS';
  else if (/edg/i.test(uaLower)) browserName = 'Microsoft Edge';
  else if (/samsungbrowser/i.test(uaLower)) browserName = 'Samsung Internet';
  else if (/opr/i.test(uaLower)) browserName = 'Opera';
  else if (/brave/i.test(uaLower)) browserName = 'Brave';
  else if (/chrome|chromium/i.test(uaLower)) browserName = 'Chrome';
  else if (isFirefox) browserName = 'Firefox';
  else if (isSafariEngine) browserName = 'Safari';

  // 7. Determine Installation Mechanism
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

  // 8. Compute Default iOS Smart Pointer Target Position
  const viewport = detectViewportMetrics();
  let defaultIOSPointerPosition: IOSPointerPosition = 'bottom-center';
  if (platform === 'ios') {
    if (iosBrowser === 'chrome') {
      // Chrome on iOS places the Share icon [↑] inside the top-right address bar
      defaultIOSPointerPosition = 'top-right';
    } else if (iosBrowser === 'safari') {
      // Safari on iPad or Landscape places Share at top-right; iPhone Portrait places Share at bottom-center
      defaultIOSPointerPosition =
        viewport.safariToolbarLayout === 'top' ? 'top-right' : 'bottom-center';
    } else if (iosBrowser === 'webview') {
      defaultIOSPointerPosition = 'top-right';
    } else {
      // Edge, Firefox, Brave, Opera on iOS place their menu/share control at bottom-right
      defaultIOSPointerPosition = 'bottom-right';
    }
  }

  return {
    platform,
    mechanism,
    browserName,
    iosBrowser,
    isIPad: isIPadOS,
    isInAppWebView,
    isDesktopFirefox,
    isMacOSSafari,
    isAndroidFirefox,
    isIOSLegacyNonSafari,
    isIOSChrome,
    isIOSSafari,
    isIOSEdge,
    isIOSFirefox,
    isChromiumCapable,
    iosMajorVersion,
    defaultIOSPointerPosition,
  };
}

export function detectDevicePlatform(): DevicePlatform {
  return detectInstallEnvironment().platform;
}

function waitForNativePromptEvent(timeoutMs = 350): Promise<BeforeInstallPromptEvent | null> {
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
    iosBrowser: null,
    isIPad: false,
    isInAppWebView: false,
    isDesktopFirefox: false,
    isMacOSSafari: false,
    isAndroidFirefox: false,
    isIOSLegacyNonSafari: false,
    isIOSChrome: false,
    isIOSSafari: false,
    isIOSEdge: false,
    isIOSFirefox: false,
    isChromiumCapable: false,
    iosMajorVersion: null,
    defaultIOSPointerPosition: 'bottom-center',
  }));

  const [viewport, setViewport] = useState<ViewportMetrics>(() => ({
    width: 390,
    height: 844,
    orientation: 'portrait',
    isCompactHeight: false,
    safariToolbarLayout: 'bottom',
  }));

  useEffect(() => {
    setIsMounted(true);
    const detectedEnv = detectInstallEnvironment();
    const detectedViewport = detectViewportMetrics();
    setEnv(detectedEnv);
    setViewport(detectedViewport);

    if (typeof window === 'undefined') return;

    // Reactive screen size, orientation, and visualViewport listener
    const handleViewportResize = () => {
      setViewport(detectViewportMetrics());
      setEnv(detectInstallEnvironment());
    };

    window.addEventListener('resize', handleViewportResize, { passive: true });
    window.addEventListener('orientationchange', handleViewportResize, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize, { passive: true });
    }

    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    // Restore manual iOS pointer position preference if set by user
    try {
      const savedPos = localStorage.getItem(IOS_POINTER_POS_KEY) as IOSPointerPosition | null;
      if (
        savedPos &&
        ['top-right', 'bottom-center', 'bottom-right', 'top-left'].includes(savedPos)
      ) {
        updateStore({ manualIOSPointerPosition: savedPos });
      }
      const iosDismissed = sessionStorage.getItem(IOS_POINTER_DISMISS_KEY) === 'true';
      if (iosDismissed) {
        updateStore({ isIOSPointerDismissed: true });
      }
    } catch {}

    // 1. Evaluate Standalone Mode immediately — Suppress all installation UI
    if (getDisplayModeSnapshot()) {
      updateStore({
        machineState: 'RUNNING_STANDALONE',
        isInIframe: inIframe,
        isInstalledOnDevice: true,
        isInstalledVerified: true,
        isIOSPromptOpen: false,
        showInlineFallbackHint: false,
      });
      return () => {
        window.removeEventListener('resize', handleViewportResize);
        window.removeEventListener('orientationchange', handleViewportResize);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleViewportResize);
        }
      };
    }

    // 2. Evaluate Unsupported Desktop Firefox
    if (detectedEnv.isDesktopFirefox) {
      updateStore({
        machineState: 'UNSUPPORTED_BROWSER',
        isInIframe: inIframe,
      });
    }

    // 3. Sync globally captured `beforeinstallprompt` ONLY on non-iOS devices
    const existingPrompt = window.__pwaInstallPrompt || storeState.deferredPrompt;
    if (existingPrompt && detectedEnv.platform !== 'ios') {
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

    // 5. Browser-Tab Duplicate Prevention via `navigator.getInstalledRelatedApps()`
    if (detectedEnv.platform !== 'ios') {
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
    }

    // 6. Attach global window listeners once across the application lifecycle
    if (!window.__pwaListenerAttached) {
      window.__pwaListenerAttached = true;

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        const currentCheck = detectInstallEnvironment();
        // Never use Android/Chromium install prompt on iOS (even in DevTools emulation)
        if (currentCheck.platform === 'ios') return;

        const promptEvent = e as BeforeInstallPromptEvent;
        window.__pwaInstallPrompt = promptEvent;
        updateStore({
          deferredPrompt: promptEvent,
          hasPromptReceived: true,
          machineState: 'NATIVE_PROMPT_READY',
          isInstalledOnDevice: false,
          showInlineFallbackHint: false,
        });
      };

      const handleCustomPromptReady = () => {
        const currentCheck = detectInstallEnvironment();
        if (currentCheck.platform === 'ios') return;
        if (window.__pwaInstallPrompt) {
          updateStore({
            deferredPrompt: window.__pwaInstallPrompt,
            hasPromptReceived: true,
            machineState: 'NATIVE_PROMPT_READY',
            isInstalledOnDevice: false,
            showInlineFallbackHint: false,
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
          installStepText: '',
          isInstalledOnDevice: true,
          isInstalledVerified: true,
          isInstallSuccessOpen: true,
          isIOSPromptOpen: false,
          showInlineFallbackHint: false,
        });
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('bookscircle:pwa-prompt-ready', handleCustomPromptReady);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      window.removeEventListener('resize', handleViewportResize);
      window.removeEventListener('orientationchange', handleViewportResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  const isIOS = env.platform === 'ios';
  const isInstalled = isStandalone || shared.isInstalledVerified;

  // Determine UI Mode strictly based on OS, Browser, Capabilities, and Standalone state:
  // - Standalone: suppress all installation UI
  // - iOS: strictly use Smart Installation Pointer (NEVER show Android-style Install Now buttons/banners)
  // - Android / Windows / Supported Browsers: show contextual Install Now buttons/banners when native prompt is available (or supported fallback)
  const hasNativePrompt = !isIOS && Boolean(shared.hasPromptReceived || shared.deferredPrompt);

  const canShowNativeInstallUI =
    isMounted &&
    !isStandalone &&
    !isInstalled &&
    !isIOS &&
    !env.isDesktopFirefox &&
    (hasNativePrompt ||
      env.isChromiumCapable ||
      env.isMacOSSafari ||
      env.isAndroidFirefox ||
      env.platform === 'android' ||
      env.platform === 'windows');

  const shouldShowIOSSmartPointer =
    isMounted &&
    !isStandalone &&
    !isInstalled &&
    isIOS &&
    (!shared.isIOSPointerDismissed || shared.isIOSPromptOpen);

  const uiMode: PWAInstallUIMode =
    isStandalone || isInstalled
      ? 'hidden-standalone'
      : isIOS
      ? 'ios-smart-pointer'
      : hasNativePrompt
      ? 'native-install'
      : canShowNativeInstallUI
      ? 'browser-fallback'
      : 'unsupported';

  // Effective iOS Pointer Position: manual user override takes precedence, otherwise adaptive default
  const iosPointerPosition: IOSPointerPosition =
    shared.manualIOSPointerPosition || env.defaultIOSPointerPosition;

  const setIOSPointerPosition = useCallback((pos: IOSPointerPosition) => {
    updateStore({ manualIOSPointerPosition: pos });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(IOS_POINTER_POS_KEY, pos);
      } catch {}
    }
  }, []);

  const cycleIOSPointerPosition = useCallback(() => {
    const order: IOSPointerPosition[] = [
      'top-right',
      'bottom-center',
      'bottom-right',
      'top-left',
    ];
    const current = storeState.manualIOSPointerPosition || detectInstallEnvironment().defaultIOSPointerPosition;
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const nextPos = order[nextIdx];
    setIOSPointerPosition(nextPos);
  }, [setIOSPointerPosition]);

  /**
   * Triggers genuine browser installation prompt on Android / Windows / Supported Browsers.
   * Never shows fake progress or misleading success modals.
   */
  const promptInstall = useCallback(async () => {
    if (isStandalone || storeState.isInstalling) return;

    const currentEnv = detectInstallEnvironment();

    // On iOS, never run Android prompt flow — reveal the iOS Smart Installation Pointer if dismissed/minimized
    if (currentEnv.platform === 'ios') {
      updateStore({
        isIOSPointerDismissed: false,
        iosPointerMinimized: false,
        isIOSPromptOpen: true,
      });
      return;
    }

    if (currentEnv.isDesktopFirefox) {
      return;
    }

    // Proactive Cache Hygiene: remove any stale non-v18 caches
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        const staleKeys = keys.filter(
          (k) =>
            !k.includes('bookscircle-v18') &&
            !k.includes('bookscircle-shell-v18') &&
            !k.includes('bookscircle-auth-sync-v1')
        );
        if (staleKeys.length > 0) {
          await Promise.allSettled(staleKeys.map((k) => caches.delete(k)));
        }
      }
    } catch {}

    // If already installed on device and no prompt event, launch directly
    if (storeState.isInstalledOnDevice && !storeState.deferredPrompt) {
      const targetUrl = `${window.location.origin}/?source=pwa`;
      window.location.assign(targetUrl);
      return;
    }

    // Ensure Service Worker is registered for Chromium installability
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
      } catch {}
    }

    const activePrompt = await waitForNativePromptEvent(350);

    if (activePrompt) {
      try {
        updateStore({
          machineState: 'AWAITING_USER_CHOICE',
          isInstalling: true,
          installStepText: 'Confirm installation in your browser dialog...',
          showInlineFallbackHint: false,
        });

        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;

        if (typeof window !== 'undefined') {
          window.__pwaInstallPrompt = null;
        }

        if (choice.outcome === 'accepted') {
          // Keep isInstalling true and wait for native 'appinstalled' event before marking completed.
          // This eliminates premature success notifications before Android / Windows finishes installing.
          updateStore({
            deferredPrompt: null,
            hasPromptReceived: false,
            machineState: 'OS_HANDOFF_IN_PROGRESS',
            isInstalling: true,
            installStepText: 'Installing BooksCircle on your device...',
            isInstalledOnDevice: false,
            isInstallSuccessOpen: false,
          });
          syncLiveCatalogInBackground();

          // Safe fallback timeout (25 seconds) in case browser does not dispatch appinstalled
          setTimeout(() => {
            if (storeState.isInstalling) {
              updateStore({
                isInstalling: false,
                installStepText: '',
                isInstalledOnDevice: true,
              });
            }
          }, 25000);
        } else {
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
        updateStore({
          deferredPrompt: null,
          hasPromptReceived: false,
          machineState: 'IDLE_ELIGIBLE',
          isInstalling: false,
          installStepText: '',
          showInlineFallbackHint: true,
        });
      }
    } else {
      // Appropriate lightweight inline fallback when native prompt event is unavailable
      updateStore({
        isInstalling: false,
        installStepText: '',
        showInlineFallbackHint: !storeState.showInlineFallbackHint,
      });
    }
  }, [isStandalone]);

  const dismissBanner = useCallback(() => {
    updateStore({
      isDismissed: true,
      showInlineFallbackHint: false,
      machineState: 'PROMPT_DISMISSED',
    });
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

  const dismissIOSPointer = useCallback(() => {
    updateStore({
      isIOSPointerDismissed: true,
      isIOSPromptOpen: false,
      iosPointerMinimized: false,
    });
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(IOS_POINTER_DISMISS_KEY, 'true');
      } catch {}
    }
  }, []);

  const toggleIOSPointerMinimized = useCallback(() => {
    updateStore({
      iosPointerMinimized: !storeState.iosPointerMinimized,
    });
  }, []);

  const closeInlineFallbackHint = useCallback(() => {
    updateStore({ showInlineFallbackHint: false });
  }, []);

  const closeIOSPrompt = useCallback(() => {
    updateStore({ isIOSPromptOpen: false, isIOSPointerDismissed: true });
  }, []);

  const openIOSPrompt = useCallback(() => {
    updateStore({
      isIOSPromptOpen: true,
      isIOSPointerDismissed: false,
      iosPointerMinimized: false,
    });
  }, []);

  const closeInstallSuccess = useCallback(() => {
    updateStore({
      isInstallSuccessOpen: false,
      installStepText: '',
    });
  }, []);

  const launchInstalledApp = useCallback(async () => {
    if (storeState.isLaunching) return;
    updateStore({ isLaunching: true });
    try {
      await flushAllAppCachesAndStorage();
    } catch {}
    if (typeof window !== 'undefined') {
      let authQuery = '';
      try {
        const rawUser =
          localStorage.getItem('bookscircle_auth_user') ||
          localStorage.getItem('bookscircle_user_session');
        if (rawUser) {
          authQuery = `&_auth=${encodeURIComponent(btoa(unescape(encodeURIComponent(rawUser))))}`;
        }
      } catch {}
      const targetUrl = `${window.location.origin}/?source=pwa${authQuery}`;
      window.location.assign(targetUrl);
    }
  }, []);

  return {
    isMounted,
    // Strictly false on iOS so Android-style buttons/banners never appear on iOS
    isInstallable: canShowNativeInstallUI,
    canShowNativeInstallUI,
    shouldShowIOSSmartPointer,
    uiMode,
    isInstalled,
    isInstalledOnDevice: shared.isInstalledOnDevice,
    isInstalledVerified: shared.isInstalledVerified,
    isStandalone,
    isIOS,
    platform: env.platform,
    environment: env,
    viewport,
    iosPointerPosition,
    iosPointerMinimized: shared.iosPointerMinimized,
    isIOSPointerDismissed: shared.isIOSPointerDismissed,
    showInlineFallbackHint: shared.showInlineFallbackHint,
    machineState: isStandalone ? 'RUNNING_STANDALONE' : shared.machineState,
    isInIframe: shared.isInIframe,
    hasNativePrompt,
    isInstalling: shared.isInstalling,
    isLaunching: shared.isLaunching,
    installProgress: 0,
    installStepText: shared.installStepText,
    isDismissed: shared.isDismissed,
    isIOSPromptOpen: shared.isIOSPromptOpen,
    isInstallSuccessOpen: shared.isInstallSuccessOpen,
    promptInstall,
    dismissBanner,
    dismissIOSPointer,
    toggleIOSPointerMinimized,
    setIOSPointerPosition,
    cycleIOSPointerPosition,
    closeInlineFallbackHint,
    closeIOSPrompt,
    openIOSPrompt,
    closeInstallSuccess,
    launchInstalledApp,
    forceHardFlushAndReloadApp,
  };
}
