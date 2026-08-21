'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileText,
  RefreshCw,
  Award,
  Mail,
  MapPin,
  Globe,
  Lock,
  Headphones,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface FooterProps {
  onNavigateToTab?: (tab: 'home' | 'categories' | 'cart' | 'purchased' | 'profile') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateToTab }) => {
  return (
    <footer id="app-main-footer" className="w-full bg-gray-50 border-t border-gray-200 mt-12 pt-10 pb-20 text-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Section: Brand & Razorpay Compliance Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-gray-200">
          
          {/* Brand & Mission Statement */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-[#4029AB]">
                Exam Kart
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#4029AB]/10 text-[#4029AB] px-2 py-0.5 rounded-full">
                BooksCircle Platform
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed max-w-md">
              Exam Kart (Legal Entity: <strong className="text-gray-900 font-bold">Pardeep Kumar</strong>) is a dedicated digital e-book and study materials platform providing instant, high-quality competitive exam guides for UPSC, SSC, Banking, and State Govt exams on <a href="https://bookscircle.org/" className="text-[#4029AB] font-semibold hover:underline">https://bookscircle.org/</a>.
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-medium text-gray-800 shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-bit SSL Razorpay Checkout</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-medium text-gray-800 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#4029AB]" />
                <span>Instant Digital PDF Delivery</span>
              </div>
            </div>
          </div>

          {/* Quick Legal & Razorpay Policy Links */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#4029AB]" />
              <span>Razorpay Policies & Compliance</span>
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <li>
                <Link
                  href="/privacy-policy"
                  className="group flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200/80 hover:border-[#4029AB]/50 hover:bg-[#4029AB]/5 text-gray-800 hover:text-[#4029AB] transition-all font-medium"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#4029AB]" />
                    <span>Privacy Policy</span>
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-[#4029AB] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>

              <li>
                <Link
                  href="/terms-and-conditions"
                  className="group flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200/80 hover:border-[#4029AB]/50 hover:bg-[#4029AB]/5 text-gray-800 hover:text-[#4029AB] transition-all font-medium"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#4029AB]" />
                    <span>Terms of Service</span>
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-[#4029AB] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>

              <li>
                <Link
                  href="/license-agreement"
                  className="group flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200/80 hover:border-[#4029AB]/50 hover:bg-[#4029AB]/5 text-gray-800 hover:text-[#4029AB] transition-all font-medium"
                >
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#4029AB]" />
                    <span>License Agreement</span>
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-[#4029AB] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>

              <li>
                <Link
                  href="/refund-policy"
                  className="group flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200/80 hover:border-[#4029AB]/50 hover:bg-[#4029AB]/5 text-gray-800 hover:text-[#4029AB] transition-all font-medium"
                >
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-[#4029AB]" />
                    <span>Refund Policy</span>
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-[#4029AB] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>

              <li className="sm:col-span-2">
                <Link
                  href="/contact"
                  className="group flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200/80 hover:border-[#4029AB]/50 hover:bg-[#4029AB]/5 text-gray-800 hover:text-[#4029AB] transition-all font-medium"
                >
                  <span className="flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Contact Us & Customer Support</span>
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-[#4029AB] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Official Registered Legal Entity Box */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#4029AB]" />
              <span>Registered Business Entity</span>
            </h4>
            <div className="p-3.5 rounded-2xl bg-white border border-gray-200 space-y-2 text-xs shadow-2xs">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Legal Name</p>
                <p className="font-bold text-gray-950">Pardeep Kumar</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Brand Name</p>
                <p className="font-bold text-[#4029AB]">Exam Kart</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Support Email</p>
                <a
                  href="mailto:support@exam-kart.com"
                  className="font-medium text-gray-800 hover:text-[#4029AB] hover:underline flex items-center gap-1"
                >
                  <Mail className="w-3 h-3 text-gray-400" />
                  <span>support@exam-kart.com</span>
                </a>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Office Address</p>
                <p className="text-gray-700 leading-snug">
                  1st Floor, SCO-28, Sector 13, Bhiwani, Haryana 127021, India
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Official Website</p>
                <a
                  href="https://bookscircle.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#4029AB] hover:underline flex items-center gap-1"
                >
                  <Globe className="w-3 h-3 text-gray-400" />
                  <span>https://bookscircle.org/</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Payment Compliance */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 pt-2">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <p>© {new Date().getFullYear()} Exam Kart (Legal: Pardeep Kumar). All rights reserved.</p>
            <span className="hidden sm:inline text-gray-300">•</span>
            <p>Official Merchant on Razorpay Payment Gateway</p>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold text-gray-600">
            <Link href="/privacy-policy" className="hover:text-[#4029AB] hover:underline">Privacy</Link>
            <Link href="/terms-and-conditions" className="hover:text-[#4029AB] hover:underline">Terms</Link>
            <Link href="/license-agreement" className="hover:text-[#4029AB] hover:underline">License</Link>
            <Link href="/refund-policy" className="hover:text-[#4029AB] hover:underline">Refunds</Link>
            <Link href="/contact" className="hover:text-[#4029AB] hover:underline">Contact</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
