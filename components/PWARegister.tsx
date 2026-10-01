'use client';

import { useEffect } from 'react';
import { requestPersistentStorage } from '@/lib/offline-storage';

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Request persistent storage from browser engine immediately
    requestPersistentStorage().catch(() => {});

    // 2. Service Worker lifecycle governance
    if ('serviceWorker' in navigator) {
      const isDevOrPreview =
        process.env.NODE_ENV !== 'production' ||
        window.self !== window.top ||
        window.location.hostname === 'localhost' ||
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.includes('run.app');

      if (isDevOrPreview) {
        // Unregister any active or legacy service workers in dev/preview to prevent stale script caching
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().catch(() => {});
          }
        }).catch(() => {});

        // Purge old SW cache stores
        if ('caches' in window) {
          caches.keys().then((keys) => {
            for (const key of keys) {
              if (key.startsWith('bookscircle')) {
                caches.delete(key).catch(() => {});
              }
            }
          }).catch(() => {});
        }
      } else {
        // True standalone production PWA registration
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .catch(() => {});
        });
      }
    }

    // 3. Keep storage persistent on visibility change / focus
    const handleFocus = () => {
      requestPersistentStorage().catch(() => {});
    };
    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return null;
}
