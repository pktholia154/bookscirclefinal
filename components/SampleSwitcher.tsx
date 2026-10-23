'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

interface SampleSwitcherProps {
  onOpenPdf: () => void;
  onOpenMd: () => void;
  className?: string;
}

const SAMPLE_LETTERS = ['S', 'A', 'M', 'P', 'L', 'E'];

/**
 * SampleSwitcher
 *
 * Implements an attention-catching switcher for book samples:
 * 1. "SAMPLE" centered with character-by-character entry animation.
 * 2. Rectangular split button with slight corner radius (rounded-md) containing "PDF" and "mobile" buttons.
 * 3. Split buttons remain completely stable and tactile for immediate clicking.
 * 4. Compatible with single-token theme (#4029AB, white, slate).
 */
export const SampleSwitcher: React.FC<SampleSwitcherProps> = ({
  onOpenPdf,
  onOpenMd,
  className = '',
}) => {
  const [animKey, setAnimKey] = useState(0);

  // Periodically re-animate characters every 4.2 seconds to continually grab visitor attention
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimKey((prev) => (prev + 1) % 1000);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {/* Attached SAMPLE tag text centered with character-by-character animation */}
      <div className="flex items-center justify-center px-0.5 text-center h-[18px]">
        <motion.span
          key={animKey}
          id="sample-label-text"
          className="inline-flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-widest select-none"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1,
              },
            },
          }}
        >
          {SAMPLE_LETTERS.map((char, index) => (
            <motion.span
              key={index}
              variants={{
                hidden: { opacity: 0, y: -2, scale: 0.75 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: 'spring',
                    damping: 12,
                    stiffness: 220,
                  },
                },
              }}
              className="inline-block"
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </div>

      {/* 2. Rectangular Split Container with Slight Corner Radius (rounded-md) */}
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
