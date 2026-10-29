'use client';

import React from 'react';
import { FileText, Smartphone } from 'lucide-react';

interface SampleSwitcherProps {
  onOpenPdf: () => void;
  onOpenMd: () => void;
  className?: string;
}

export const SampleSwitcher: React.FC<SampleSwitcherProps> = ({
  onOpenPdf,
  onOpenMd,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {/* Attached SAMPLE tag text centered */}
      <div className="flex items-center justify-center px-0.5 text-center h-[18px]">
        <span
          id="sample-label-text"
          className="inline-flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-widest select-none"
        >
          SAMPLE
        </span>
      </div>

      {/* Rectangular Split Container with Slight Corner Radius (rounded-md) */}
      <div
        id="sample-split-capsule"
        className="flex items-stretch rounded-md overflow-hidden border-2 border-[#4029AB] shadow-xs h-10 w-full bg-[#4029AB] p-[2px] transition-shadow hover:shadow-md"
      >
        {/* Left Clickable Half: PDF */}
        <button
          type="button"
          id="sample-btn-pdf"
          onClick={onOpenPdf}
          className="flex-1 rounded-l-[4px] bg-[#4029AB] hover:bg-[#34208e] active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer px-2.5 border-r border-white/25 select-none"
          title="Read Free Sample in PDF format"
          aria-label="Read Sample PDF"
        >
          <FileText className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="tracking-tight">PDF</span>
        </button>

        {/* Right Clickable Half: mobile */}
        <button
          type="button"
          id="sample-btn-epub"
          onClick={onOpenMd}
          className="flex-1 rounded-r-[4px] bg-white hover:bg-gray-50 active:scale-95 text-[#4029AB] font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer px-2.5 select-none"
          title="Read Free Sample in Mobile format (KaTeX math supported)"
          aria-label="Read Sample mobile"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#4029AB] shrink-0" />
          <span className="tracking-tight">mobile</span>
        </button>
      </div>
    </div>
  );
};
