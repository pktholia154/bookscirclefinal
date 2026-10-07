'use client';

import React, { useState, useEffect } from 'react';
import { Eye, FileText, Sparkles, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface SampleSwitcherProps {
  onOpenPdf: () => void;
  onOpenMd: () => void;
  className?: string;
}

/**
 * SampleSwitcher
 *
 * Implements an attention-catching switcher for book samples:
 * 1. "Sample" acts as a prominent label pill that flashes a few times on load to catch visitor attention.
 * 2. Directly below, a split capsule with stable clickable "PDF" and "epub" (Markdown) buttons.
 * 3. Split buttons remain completely stable and tactile for immediate clicking.
 * 4. Compatible with single-token theme (#4029AB, white, slate).
 */
export const SampleSwitcher: React.FC<SampleSwitcherProps> = ({
  onOpenPdf,
  onOpenMd,
  className = '',
}) => {
  const [hasAnimated, setHasAnimated] = useState(false);

  // Set animation complete after 3 seconds so subsequent renders remain completely stable
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasAnimated(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {/* Attached SAMPLE tag text at top left corner in small light font */}
      <div className="flex items-center justify-start px-0.5">
        <span
          id="sample-label-text"
          className="text-[10px] sm:text-[11px] font-medium text-gray-500 uppercase tracking-wider select-none"
        >
          SAMPLE
        </span>
      </div>

      {/* 2. Split Capsule with Clickable "PDF" and "epub" (Markdown) Buttons */}
      <div
        id="sample-split-capsule"
        className="flex items-stretch rounded-full overflow-hidden border-2 border-[#4029AB] shadow-xs h-10 w-full bg-[#4029AB] p-[2px] transition-shadow hover:shadow-md"
      >
        {/* Left Clickable Half: PDF */}
        <button
          type="button"
          id="sample-btn-pdf"
          onClick={onOpenPdf}
          className="flex-1 rounded-l-full bg-[#4029AB] hover:bg-[#34208e] active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer px-2.5 border-r border-white/25 select-none"
          title="Read Free Sample in PDF format"
          aria-label="Read Sample PDF"
        >
          <FileText className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="tracking-tight">PDF</span>
        </button>

        {/* Right Clickable Half: epub (Markdown .md) */}
        <button
          type="button"
          id="sample-btn-epub"
          onClick={onOpenMd}
          className="flex-1 rounded-r-full bg-white hover:bg-gray-50 active:scale-95 text-[#4029AB] font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer px-2.5 select-none"
          title="Read Free Sample in Markdown / ePub format (KaTeX math supported)"
          aria-label="Read Sample ePub / Markdown"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#4029AB] shrink-0" />
          <span className="tracking-tight">epub</span>
        </button>
      </div>
    </div>
  );
};
