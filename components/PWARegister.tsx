'use client';

import { useEffect } from 'react';
import { requestPersistentStorage } from '@/lib/offline-storage';
import { BeforeInstallPromptEvent } from '@/hooks/use-pwa-install';

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Capture beforeinstallprompt as early as possible on mount
    const captureEarlyPrompt = (e: Event) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', captureEarlyPrompt);

    // 2. Request persistent storage from browser engine immediately
    requestPersistentStorage().catch(() => {});

    // 3. Service Worker lifecycle governance (required for Android/Windows/Desktop PWA installability)
    if ('serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            registration.update().catch(() => {});
          })
          .catch(() => {});
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW, { once: true });
      }

      // Clean up outdated cache buckets while preserving current v18 static media & shell caches
      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => {
            for (const key of keys) {
              if (
                key.startsWith('bookscircle') &&
                key !== 'bookscircle-v18' &&
                key !== 'bookscircle-shell-v18' &&
                key !== 'bookscircle-auth-sync-v1'
              ) {
                caches.delete(key).catch(() => {});
              }
            }
          })
          .catch(() => {});
      }
    }

    // 4. Keep storage persistent on visibility change / focus
    const handleFocus = () => {
      requestPersistentStorage().catch(() => {});
    };
    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('beforeinstallprompt', captureEarlyPrompt);
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return null;
}
