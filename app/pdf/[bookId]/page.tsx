'use client';

import { Suspense } from 'react';
import PDFReader from '@/components/PDFReader';

export default function PDFParamPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-white flex items-center justify-center text-slate-700">
          Loading PDF Reader...
        </div>
      }
    >
      <PDFReader />
    </Suspense>
  );
}
