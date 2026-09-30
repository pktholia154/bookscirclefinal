'use client';

import { Suspense } from 'react';
import MarkdownReader from '@/components/MarkdownReader';

export default function MarkdownQueryPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-white flex items-center justify-center text-slate-700">
          Loading Markdown Viewer...
        </div>
      }
    >
      <MarkdownReader />
    </Suspense>
  );
}
