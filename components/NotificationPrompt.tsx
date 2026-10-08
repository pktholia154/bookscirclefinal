'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Bell, BellRing, Check, X } from 'lucide-react';

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

export const NotificationPrompt: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);

      // Check if user already dismissed recently
      const dismissed = localStorage.getItem('bookscircle_notifications_dismissed');
      if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      if (window.OneSignal && window.OneSignal.Notifications) {
        try {
          await window.OneSignal.Notifications.requestPermission();
        } catch {
          // If domain restriction prevents OneSignal request, fall back to native browser prompt
          if ('Notification' in window) {
            await Notification.requestPermission();
          }
        }
        if ('Notification' in window) {
          setPermission(Notification.permission);
        }
      } else if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async (OneSignal: any) => {
          try {
            if (OneSignal?.Notifications) {
              await OneSignal.Notifications.requestPermission();
            } else if ('Notification' in window) {
              await Notification.requestPermission();
            }
          } catch {
            if ('Notification' in window) {
              await Notification.requestPermission();
            }
          }
          if ('Notification' in window) {
            setPermission(Notification.permission);
          }
        });
      } else if ('Notification' in window) {
        const result = await Notification.requestPermission();
        setPermission(result);
      }
    } catch (err) {
      console.warn('Notification permission request:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('bookscircle_notifications_dismissed', Date.now().toString());
  };

  // Only show if not granted and not dismissed
  if (permission === 'granted' || isDismissed || permission === 'denied') {
    return null;
  }

  return (
    <div
      id="notification-prompt-banner"
      className="w-full bg-[#4029AB]/5 border-y border-[#4029AB]/15 px-4 py-2.5 transition-all"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-7 h-7 shrink-0 rounded-lg overflow-hidden bg-white shadow-xs border border-gray-100 flex items-center justify-center">
            <Image
              src="/booksCircle%20(3).png"
              alt="BooksCircle Logo"
              width={28}
              height={28}
              unoptimized
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">
              Daily Updates: Check Out New Books!
            </p>
            <p className="text-[11px] text-gray-600 truncate">
              Get notified daily when fresh PDF guides and study books arrive.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="px-3 py-1 bg-[#4029AB] hover:bg-[#34208e] text-white text-xs font-bold rounded-lg shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Enabling...' : 'Enable'}</span>
          </button>
          <button
            onClick={handleDismiss}
            title="Dismiss"
            aria-label="Dismiss"
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
