'use client';

import React from 'react';
import Link from 'next/link';

interface FooterProps {
  onNavigateToTab?: (tab: 'home' | 'categories' | 'cart' | 'purchased' | 'profile') => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer id="app-main-footer" className="w-full bg-white border-t border-gray-100 mt-10 pt-6 pb-20 text-gray-500">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center sm:text-left space-y-3 text-xs leading-relaxed">
        {/* Navigation & Legal Links */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs font-semibold text-gray-700">
          <Link href="/privacy-policy" className="hover:text-[#4029AB] transition-colors">
            Privacy Policy
          </Link>
          <span className="text-gray-300 select-none">•</span>
          <Link href="/terms-and-conditions" className="hover:text-[#4029AB] transition-colors">
            Terms of Service
          </Link>
          <span className="text-gray-300 select-none">•</span>
          <Link href="/refund-policy" className="hover:text-[#4029AB] transition-colors">
            Refund & Cancellation Policy
          </Link>
          <span className="text-gray-300 select-none">•</span>
          <Link href="/license-agreement" className="hover:text-[#4029AB] transition-colors">
            License Agreement
          </Link>
          <span className="text-gray-300 select-none">•</span>
          <Link href="/contact" className="hover:text-[#4029AB] transition-colors">
            Contact Us
          </Link>
          <span className="text-gray-300 select-none">•</span>
          <a
            href="mailto:support@exam-kart.com"
            className="hover:text-[#4029AB] transition-colors font-medium"
          >
            support@exam-kart.com
          </a>
        </div>

        {/* Minimal Legal & Copyright Text */}
        <div className="flex flex-col sm:flex-row items-center sm:items-baseline justify-between gap-2 text-[11px] text-gray-400 pt-1">
          <p>
            © {new Date().getFullYear()} <span className="font-semibold text-gray-600">Exam Kart</span> (Legal Entity: Pardeep Kumar). All rights reserved.
          </p>
          <p className="text-[11px] text-gray-400">
            Sector 13, Bhiwani, Haryana 127021, India
          </p>
        </div>
      </div>
    </footer>
  );
};

