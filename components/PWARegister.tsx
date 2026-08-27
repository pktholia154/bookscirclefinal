'use client';

import { useEffect } from 'react';
import { requestPersistentStorage } from '@/lib/offline-storage';

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Request persistent storage from browser engine immediately
      requestPersistentStorage().catch(() => {});

      // 2. Register service worker
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => {
              if (process.env.NODE_ENV === 'development') {
                console.log('[PWA] Service Worker registered with scope:', reg.scope);
              }
            })
            .catch((err) => {
              console.warn('[PWA] Service Worker registration failed:', err);
            });
        });
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
    }
  }, []);

  return null;
}

