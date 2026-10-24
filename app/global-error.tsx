'use client';

import React, { useEffect } from 'react';

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.warn('Global error boundary caught:', error?.message || String(error));
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="max-w-sm space-y-4">
          <h1 className="text-xl font-black text-gray-950">BooksCircle</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            Reconnecting to BooksCircle catalog...
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                try {
                  reset();
                } catch {
                  window.location.href = '/';
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-[#4029AB] text-white text-xs font-bold cursor-pointer"
            >
              Reload View
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-800 text-xs font-bold cursor-pointer"
            >
              Home Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
