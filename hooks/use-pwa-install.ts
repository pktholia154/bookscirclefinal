'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

// Standalone mode subscriber using useSyncExternalStore
function subscribeToDisplayMode(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
  mediaQuery.addEventListener('change', callback);
  fullscreenQuery.addEventListener('change', callback);
  window.addEventListener('appinstalled', callback);
  return () => {
    mediaQuery.removeEventListener('change', callback);
    fullscreenQuery.removeEventListener('change', callback);
    window.removeEventListener('appinstalled', callback);
  };
}

function getDisplayModeSnapshot() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function getDisplayModeServerSnapshot() {
  return false;
}

export function usePWAInstall() {
  const isStandalone = useSyncExternalStore(
    subscribeToDisplayMode,
    getDisplayModeSnapshot,
    getDisplayModeServerSnapshot
  );

  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSPromptOpen, setIsIOSPromptOpen] = useState<boolean>(false);
  const [isInstallSuccessOpen, setIsInstallSuccessOpen] = useState<boolean>(false);
  const [hasPromptReceived, setHasPromptReceived] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const ios = typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(ios);

    // If prompt was already captured globally
    if (typeof window !== 'undefined' && window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
      setHasPromptReceived(true);
    }

    try {
      const justInstalled = localStorage.getItem('bookscircle_just_installed');
      const acknowledged = localStorage.getItem('bookscircle_install_ack');
      if (justInstalled === 'true' && acknowledged !== 'true') {
        setIsInstallSuccessOpen(true);
      }
    } catch {}

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      if (typeof window !== 'undefined') {
        window.__pwaInstallPrompt = promptEvent;
      }
      setDeferredPrompt(promptEvent);
      setHasPromptReceived(true);
      try {
        localStorage.removeItem('bookscircle_pwa_installed');
      } catch {}
    };

    const handleAppInstalled = () => {
      if (typeof window !== 'undefined') {
        window.__pwaInstallPrompt = null;
        try {
          localStorage.setItem('bookscircle_just_installed', 'true');
        } catch {}
      }
      setDeferredPrompt(null);
      setHasPromptReceived(false);
      setIsInstallSuccessOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // App is installable only after client mount if it's not currently running in standalone app mode and either beforeinstallprompt has fired or on iOS
  const isInstallable = isMounted && !isStandalone && (hasPromptReceived || isIOS);

  const promptInstall = useCallback(async () => {
    if (isStandalone) return;

    const activePrompt = deferredPrompt || (typeof window !== 'undefined' ? window.__pwaInstallPrompt : null);

    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setHasPromptReceived(false);
          if (typeof window !== 'undefined') {
            window.__pwaInstallPrompt = null;
            try {
              localStorage.setItem('bookscircle_just_installed', 'true');
            } catch {}
          }
          setIsInstallSuccessOpen(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      setIsIOSPromptOpen(true);
    }
  }, [deferredPrompt, isStandalone]);

  const closeIOSPrompt = useCallback(() => {
    setIsIOSPromptOpen(false);
  }, []);

  const closeInstallSuccess = useCallback(() => {
    setIsInstallSuccessOpen(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bookscircle_install_ack', 'true');
        localStorage.removeItem('bookscircle_just_installed');
      } catch {}
    }
  }, []);

  return {
    isInstallable,
    isInstalled: isStandalone,
    isIOS,
    isIOSPromptOpen,
    isInstallSuccessOpen,
    promptInstall,
    closeIOSPrompt,
    closeInstallSuccess,
  };
}
