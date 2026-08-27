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

// Standalone mode subscriber using useSyncExternalStore (prevents SSR mismatch and no setState in effect)
function subscribeToDisplayMode(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  mediaQuery.addEventListener('change', callback);
  window.addEventListener('appinstalled', callback);
  return () => {
    mediaQuery.removeEventListener('change', callback);
    window.removeEventListener('appinstalled', callback);
  };
}

function getDisplayModeSnapshot() {
  if (typeof window === 'undefined') return false;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
  const isMarkedInstalled = localStorage.getItem('bookscircle_pwa_installed') === 'true';
  return isStandalone || isMarkedInstalled;
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

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSPromptOpen, setIsIOSPromptOpen] = useState<boolean>(false);
  const [hasPromptReceived, setHasPromptReceived] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setHasPromptReceived(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setHasPromptReceived(false);
      localStorage.setItem('bookscircle_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const isIOS = typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isInstallable = !isStandalone && (hasPromptReceived || isIOS);

  const promptInstall = useCallback(async () => {
    if (isStandalone) return;

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          localStorage.setItem('bookscircle_pwa_installed', 'true');
          setHasPromptReceived(false);
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

  return {
    isInstallable,
    isInstalled: isStandalone,
    isIOS,
    isIOSPromptOpen,
    promptInstall,
    closeIOSPrompt,
  };
}
