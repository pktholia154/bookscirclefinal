'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface NativeLoaderContextType {
  showLoader: (durationMs?: number) => void;
  hideLoader: () => void;
  isLoading: boolean;
}

const NativeLoaderContext = createContext<NativeLoaderContextType>({
  showLoader: () => {},
  hideLoader: () => {},
  isLoading: false,
});

export const useNativeLoader = () => useContext(NativeLoaderContext);

/**
 * Programmatic helper to trigger native loader from anywhere
 */
export const triggerNativeLoading = (durationMs = 150) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('native-loader:show', { detail: { durationMs } })
    );
  }
};

export const hideNativeLoading = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('native-loader:hide'));
  }
};

/**
 * Inner component listening to Next.js route transitions
 */
function RouteChangeObserver({ onRouteSettled }: { onRouteSettled: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathRef = useRef(pathname);
  const prevParamsRef = useRef(searchParams?.toString() || '');

  useEffect(() => {
    const currentParams = searchParams?.toString() || '';
    if (prevPathRef.current !== pathname || prevParamsRef.current !== currentParams) {
      prevPathRef.current = pathname;
      prevParamsRef.current = currentParams;

      // When route or query changes, smoothly hide loader after brief render settle
      const timer = setTimeout(() => {
        onRouteSettled();
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams, onRouteSettled]);

  return null;
}

export const NativePageLoadingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideLoader = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    setIsLoading(false);
  }, []);

  const showLoader = useCallback((durationMs?: number) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    setIsLoading(true);

    // If a specific fixed micro-duration is requested (e.g., for non-navigating tactile feedback)
    if (durationMs && durationMs > 0) {
      hideTimerRef.current = setTimeout(() => {
        setIsLoading(false);
      }, durationMs);
    } else {
      // For page transitions, keep loader active until route settles, with safety auto-dismiss
      safetyTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 3500);
    }
  }, []);

  // Global click & touch interception for links, book cards, buttons, tabs, and interactive items
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      // Don't intercept right clicks or modified clicks (ctrl/cmd/shift/alt)
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (!target) return;

      // 0. Exclude simple immediate actions like Add to Cart or Wishlist to prevent blocking loader
      const isCartOrWishlistBtn = target.closest('[id*="cart"], [id*="wishlist"]');
      if (isCartOrWishlistBtn) {
        return;
      }

      // 1. Check if clicking on an anchor / link
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (anchor) {
        const href = anchor.getAttribute('href');
        const targetAttr = anchor.getAttribute('target');
        const download = anchor.getAttribute('download');

        // Ignore new tabs, downloads, external protocols, hash only
        if (
          targetAttr === '_blank' ||
          download !== null ||
          !href ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('#') ||
          href.startsWith('javascript:')
        ) {
          return;
        }

        // Internal navigation detected -> trigger smooth circular loader in sync with route transition
        showLoader();
        return;
      }

      // 2. Check if clicking on navigating interactive items (Book cards, list items, category chips, bottom nav tabs, view all)
      const navItem = target.closest(
        '[id^="book-card-"], [id^="list-item-"], [id^="cat-book-"], [id^="search-item-"], [id^="search-result-"], [id^="nav-tab-"], [id^="cat-chip-"], .peekaboo-item, button[id*="view-all"], a[id*="view-all"]'
      ) as HTMLElement | null;

      if (navItem) {
        // Trigger native loader in sync with page/view loading until route settled
        showLoader();
        return;
      }

      // 3. Other interactive buttons (Buy now, load more, checkout)
      const actionItem = target.closest(
        'button[id^="btn-"], button[id^="card-"], button[id^="list-"], button[id*="buy-now"], button[id*="load-more"]'
      ) as HTMLElement | null;

      if (actionItem) {
        showLoader();
      }
    };

    // Listen to custom events
    const handleCustomShow = (e: Event) => {
      const customEvent = e as CustomEvent<{ durationMs?: number }>;
      showLoader(customEvent.detail?.durationMs);
    };

    const handleCustomHide = () => {
      hideLoader();
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    window.addEventListener('native-loader:show', handleCustomShow as EventListener);
    window.addEventListener('native-loader:hide', handleCustomHide as EventListener);

    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
      window.removeEventListener('native-loader:show', handleCustomShow as EventListener);
      window.removeEventListener('native-loader:hide', handleCustomHide as EventListener);
    };
  }, [showLoader, hideLoader]);

  return (
    <NativeLoaderContext.Provider value={{ showLoader, hideLoader, isLoading }}>
      <Suspense fallback={null}>
        <RouteChangeObserver onRouteSettled={hideLoader} />
      </Suspense>

      {children}

      {/* Native Mobile App Circular Loading Indicator HUD */}
      {isLoading && (
        <div
          id="native-app-circular-loader"
          className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center transition-all duration-200 animate-in fade-in"
          aria-live="polite"
          aria-busy="true"
        >
          {/* Subtle semi-transparent scrim with soft backdrop blur */}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1.5px] transition-opacity duration-200" />

          {/* Native Activity Indicator Floating Card */}
          <div className="relative z-10 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-4 border border-gray-100/90 flex flex-col items-center justify-center gap-2.5 transition-transform duration-200 scale-100 animate-in zoom-in-95">
            {/* High-definition native circular SVG spinner */}
            <div className="relative w-10 h-10 flex items-center justify-center">
              {/* Background circular track */}
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 44 44"
                fill="none"
              >
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  stroke="#4029AB"
                  strokeWidth="3.5"
                  strokeOpacity="0.15"
                  className="transition-colors"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  stroke="#4029AB"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="90 120"
                  className="origin-center animate-spin"
                  style={{
                    animationDuration: '0.85s',
                    animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </svg>

              {/* Inner glowing center pulse */}
              <div className="absolute w-2 h-2 rounded-full bg-[#4029AB]/20 animate-ping" />
            </div>

            {/* Native Micro Label */}
            <span className="text-[11px] font-bold text-gray-700 tracking-tight select-none">
              Loading...
            </span>
          </div>

          {/* Micro Top Progress Bar for instant native feel */}
          <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-transparent z-[10000] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#4029AB] via-[#6348dd] to-[#4029AB] animate-[progress_1s_ease-in-out_infinite] w-full" />
          </div>
        </div>
      )}
    </NativeLoaderContext.Provider>
  );
};
