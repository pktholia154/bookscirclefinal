'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, BookOpen } from 'lucide-react';
import { hideNativeLoading } from '@/components/NativePageLoadingIndicator';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    hideNativeLoading();
    console.warn('Recovered from route error boundary:', error?.message || String(error));
    // Clean any corrupted cart/cache entries that could have triggered a client error
    try {
      const rawCart = localStorage.getItem('bookscircle_cart');
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (!Array.isArray(parsed) || parsed.some((item) => !item || !item.book || !item.book.id)) {
          localStorage.removeItem('bookscircle_cart');
        }
      }
    } catch {
      try {
        localStorage.removeItem('bookscircle_cart');
      } catch {}
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center mb-4">
        <BookOpen className="w-7 h-7" />
      </div>
      <h1 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight">
        Refreshing Page View
      </h1>
      <p className="text-xs sm:text-sm text-gray-500 max-w-sm mt-1.5 leading-relaxed">
        A temporary connection hiccup occurred while loading this view. Click below to continue seamlessly.
      </p>
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => {
            try {
              reset();
            } catch {
              window.location.href = '/';
            }
          }}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#4029AB] hover:bg-[#32208a] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all active:scale-95"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Go to Home</span>
        </Link>
      </div>
    </div>
  );
}
