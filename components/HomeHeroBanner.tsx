'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, ShoppingCart, ArrowRight, Download, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '@/components/Header';

interface HomeHeroBannerProps {
  searchQuery?: string;
  onOpenSearch: () => void;
  currentUser: UserProfile | null;
  onNavigateToProfile: () => void;
  onGoogleSignIn: () => void;
  onOpenCart: () => void;
  cartCount: number;
  onStartReading?: () => void;
  isInstallable?: boolean;
  onInstall?: () => void;
}

const ANIMATED_PLACEHOLDERS = [
  'Search 500+ UPSC, SSC & Banking PDFs...',
  'Search "Quantitative Aptitude", "General Studies"...',
  'Search CUET PG, Defense & State PSC Guides...',
  'Search Civil, Mechanical & Electrical Engineering...',
  'Search Handbooks, NCERT & Solved Papers...',
  'Search by exam, author, topic or keyword...',
];

export const HomeHeroBanner: React.FC<HomeHeroBannerProps> = ({
  searchQuery = '',
  onOpenSearch,
  currentUser,
  onNavigateToProfile,
  onGoogleSignIn,
  onOpenCart,
  cartCount,
  onStartReading,
  isInstallable = true,
  onInstall,
}) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Cycling animated placeholder to grab visitor attention
  useEffect(() => {
    if (searchQuery) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ANIMATED_PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [searchQuery]);

  const userInitial =
    currentUser?.displayName?.charAt(0).toUpperCase() ||
    currentUser?.email?.charAt(0).toUpperCase() ||
    'U';

  const handleInstallClick = () => {
    if (onInstall) {
      onInstall();
    } else if (onStartReading) {
      onStartReading();
    }
  };

  return (
    <section className="relative w-full bg-white pt-[max(env(safe-area-inset-top),14px)] pb-6 px-4 sm:px-6 md:px-8 border-b border-gray-100 select-none">
      {/* Main container with standard responsive max width */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* ROW 1: Top Profile & Brand Header Bar (Brand Logo on Left, Profile + Cart on Right) */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div
            onClick={onNavigateToProfile}
            className="flex items-center gap-2 cursor-pointer shrink-0 transition-transform active:scale-95 group"
            title="BooksCircle Home"
          >
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-white shadow-2xs p-1 flex items-center justify-center border border-gray-200 group-hover:border-[#5e17eb]/50 transition-colors">
              <Image
                src="/logo.svg"
                alt="BooksCircle"
                width={28}
                height={28}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl sm:text-2xl font-black text-[#5e17eb] tracking-tight leading-none">
              BooksCircle
            </span>
          </div>

          {/* Right Action Icons: Profile Avatar + Cart */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* User Profile Avatar / Sign In */}
            <button
              id="home-hero-profile-avatar"
              onClick={currentUser ? onNavigateToProfile : onGoogleSignIn}
              className="relative flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 hover:border-[#5e17eb]/50 shadow-2xs bg-gray-50/80 hover:bg-gray-100 transition-all cursor-pointer group"
              title={currentUser ? `Profile: ${currentUser.displayName || currentUser.email}` : 'Sign in'}
            >
              {currentUser?.photoURL ? (
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-gray-200">
                  <Image
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Profile'}
                    fill
                    sizes="32px"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : currentUser ? (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#5e17eb] text-white flex items-center justify-center text-xs font-black">
                  {userInitial}
                </div>
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#5e17eb] flex items-center justify-center text-white text-xs font-black">
                  👤
                </div>
              )}
              <span className="text-xs font-bold text-gray-800 leading-none truncate max-w-[85px] sm:max-w-[110px]">
                {currentUser?.displayName?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'Sign In'}
              </span>
            </button>

            {/* Shopping Cart Button */}
            <button
              id="home-hero-cart-btn"
              onClick={onOpenCart}
              className="relative w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full bg-gray-100 hover:bg-[#5e17eb]/10 border border-gray-200 text-[#5e17eb] flex items-center justify-center shadow-2xs transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-4 h-4 text-[#5e17eb]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#5e17eb] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ROW 2: Prominent Wide Search Bar Below the Profile Bar with Animated Attention-Grabbing Label */}
        <div className="mt-3 sm:mt-3.5">
          <div
            id="home-hero-search-pill"
            onClick={onOpenSearch}
            className="relative w-full flex items-center bg-gray-50/90 hover:bg-white border-2 border-gray-200/90 hover:border-[#5e17eb] focus-within:border-[#5e17eb] rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 shadow-xs sm:shadow-sm transition-all cursor-pointer group"
          >
            {/* Prominent Search Icon */}
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#5e17eb]/10 group-hover:bg-[#5e17eb]/20 text-[#5e17eb] mr-3 shrink-0 transition-colors">
              <Search className="w-4.5 h-4.5 text-[#5e17eb] stroke-[2.5]" />
            </div>

            {/* Animated Attention-Grabbing Rotating Placeholder */}
            <div className="relative flex-1 overflow-hidden h-6 flex items-center pointer-events-none">
              {searchQuery ? (
                <span className="text-sm sm:text-base text-gray-900 font-semibold truncate block">
                  {searchQuery}
                </span>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIndex}
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -14, opacity: 0 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="text-sm sm:text-base text-gray-500 group-hover:text-gray-700 font-medium truncate block select-none"
                  >
                    {ANIMATED_PLACEHOLDERS[placeholderIndex]}
                  </motion.span>
                </AnimatePresence>
              )}
            </div>

            {/* Micro Explore / Search Pill Indicator on the right */}
            <span className="shrink-0 ml-2 text-[11px] sm:text-xs font-bold text-[#5e17eb] bg-[#5e17eb]/10 group-hover:bg-[#5e17eb] group-hover:text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs">
              <Sparkles className="w-3 h-3" />
              <span className="hidden xs:inline">Search</span>
            </span>
          </div>
        </div>

        {/* ROW 3: Hero Content: Headline + Install App CTA + Vector Illustration */}
        <div className="mt-4 sm:mt-6 grid grid-cols-12 items-center gap-2 sm:gap-6">
          {/* Left Column: Headline and Install CTA */}
          <div className="col-span-7 sm:col-span-7 md:col-span-8 flex flex-col items-start pr-1 sm:pr-2">
            {/* Headline */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-950 tracking-tight leading-tight">
              Read eBooks
              <br />
              <span className="text-[#5e17eb]">Anywhere!</span>
            </h2>

            {/* Elegant & Attractive Install App CTA Button */}
            <div className="mt-3 sm:mt-4">
              <button
                id="home-hero-install-cta-btn"
                onClick={handleInstallClick}
                className="group inline-flex items-center gap-2.5 px-3.5 sm:px-4.5 py-2 sm:py-2.5 rounded-full bg-[#5e17eb] hover:bg-[#4d0ec5] active:scale-95 transition-all text-white shadow-md shadow-[#5e17eb]/25 border border-[#5e17eb]/30 cursor-pointer select-none"
                title="Install BooksCircle App on device"
              >
                <span className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white stroke-[2.5]" />
                </span>
                <div className="flex flex-col items-start leading-none text-left">
                  <span className="text-xs sm:text-sm font-black tracking-tight text-white">
                    Install App
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-white/80 font-medium mt-0.5">
                    Free • Offline PDF
                  </span>
                </div>
                <span className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 rounded-full bg-white text-[#5e17eb] flex items-center justify-center shadow-xs group-hover:translate-x-0.5 transition-transform ml-0.5">
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Inline SVG Vector Illustration of Boy Reading (No Smartphone, Base Theme Colors #5e17eb) */}
          <div className="col-span-5 sm:col-span-5 md:col-span-4 flex items-center justify-end">
            <div className="relative w-full max-w-[190px] sm:max-w-[230px] md:max-w-[260px] aspect-[4/3] sm:aspect-square flex items-center justify-center">
              <svg
                viewBox="0 0 260 220"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-xs select-none"
                aria-label="Illustration: Student happily reading an open e-book"
              >
                <defs>
                  {/* Base theme gradients & ambient glow */}
                  <linearGradient id="auraGrad" x1="130" y1="20" x2="130" y2="200" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#5e17eb" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#5e17eb" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="hoodieGrad" x1="120" y1="70" x2="120" y2="150" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#702afb" />
                    <stop offset="100%" stopColor="#5e17eb" />
                  </linearGradient>
                  <linearGradient id="bottomBookGrad" x1="45" y1="165" x2="210" y2="195" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4d0ec5" />
                    <stop offset="40%" stopColor="#5e17eb" />
                    <stop offset="100%" stopColor="#702afb" />
                  </linearGradient>
                  <linearGradient id="middleBookGrad" x1="60" y1="140" x2="195" y2="165" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                  <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#5e17eb" floodOpacity="0.25" />
                  </filter>
                  <filter id="illustrationShadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1e1b4b" floodOpacity="0.09" />
                  </filter>
                </defs>

                {/* 1. SOFT AMBIENT AURA & GROUND SHADOW */}
                <ellipse cx="130" cy="208" rx="80" ry="8" fill="#5e17eb" fillOpacity="0.12" />
                <circle cx="130" cy="110" r="82" fill="url(#auraGrad)" />

                {/* 2. FLOATING SPARKLE STARS & KNOWLEDGE ACCENTS */}
                {/* Left 4-Point Purple Sparkle Star */}
                <path
                  d="M32 94 C32 101 25 101 25 101 C25 101 32 101 32 108 C32 101 39 101 39 101 C39 101 32 101 32 94 Z"
                  fill="#5e17eb"
                />
                {/* Top Golden Sparkle Star */}
                <path
                  d="M216 48 C216 54 210 54 210 54 C210 54 216 54 216 60 C216 54 222 54 222 54 C222 54 216 54 216 48 Z"
                  fill="#FFB800"
                />
                {/* Small Mini Sparkle near book */}
                <circle cx="218" cy="118" r="2.5" fill="#5e17eb" fillOpacity="0.7" />
                <circle cx="44" cy="138" r="2" fill="#FFB800" />

                {/* Floating Graduation Cap Badge in #5e17eb */}
                <g filter="url(#badgeShadow)">
                  <circle cx="216" cy="78" r="15" fill="#5e17eb" />
                  {/* Mini Grad Cap */}
                  <polygon points="216,71 225,76 216,80 207,76" fill="#FFFFFF" />
                  <path d="M211,78 L211,81.5 C211,83.5 213.5,85 216,85 C218.5,85 221,83.5 221,81.5 L221,78" fill="#FFFFFF" />
                  <path d="M216,76 L224,79 L224,83" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
                </g>

                {/* 3. STACK OF BOOKS (Boy sits on top of this knowledge foundation) */}
                <g filter="url(#illustrationShadow)">
                  {/* BOTTOM BOOK: Primary #5e17eb Big Volume */}
                  {/* Purple Hardcover Base */}
                  <rect x="46" y="168" width="168" height="26" rx="5" fill="url(#bottomBookGrad)" />
                  {/* Book Pages Block (White paper block with page edge) */}
                  <rect x="58" y="171" width="152" height="20" rx="3" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
                  {/* Fine paper page lines */}
                  <line x1="64" y1="176" x2="204" y2="176" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="64" y1="181" x2="204" y2="181" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="64" y1="186" x2="204" y2="186" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Spine Bands on the left */}
                  <rect x="46" y="168" width="14" height="26" rx="4" fill="#3f0ca5" />
                  <line x1="50" y1="174" x2="56" y2="174" stroke="#702afb" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="50" y1="188" x2="56" y2="188" stroke="#702afb" strokeWidth="1.5" strokeLinecap="round" />
                  {/* Golden Bookmark Ribbon draped over bottom book */}
                  <path d="M186 170 Q188 184 192 198 L187 202 L182 198 Q183 184 184 170 Z" fill="#FFAA00" />

                  {/* MIDDLE BOOK: Fresh Emerald / Teal Volume */}
                  <rect x="62" y="146" width="140" height="22" rx="4.5" fill="url(#middleBookGrad)" />
                  <rect x="74" y="149" width="124" height="16" rx="2.5" fill="#FFFFFF" stroke="#D1FAE5" strokeWidth="1" />
                  <line x1="80" y1="154" x2="192" y2="154" stroke="#A7F3D0" strokeWidth="1" strokeLinecap="round" />
                  <line x1="80" y1="159" x2="192" y2="159" stroke="#E2E8F0" strokeWidth="1" strokeLinecap="round" />
                  {/* Spine Bands on middle book */}
                  <rect x="62" y="146" width="13" height="22" rx="3.5" fill="#047857" />
                  <line x1="65" y1="152" x2="71" y2="152" stroke="#34D399" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="65" y1="162" x2="71" y2="162" stroke="#34D399" strokeWidth="1.2" strokeLinecap="round" />
                </g>

                {/* 4. THE BOY READING CHARACTER */}
                <g filter="url(#illustrationShadow)">
                  {/* Legs / Dark Navy Trousers sitting relaxed */}
                  {/* Left Leg (Resting on book top) */}
                  <path d="M96 142 Q108 156 122 154 L126 146 Q112 142 104 136 Z" fill="#17143D" />
                  {/* Right Leg (Crossed comfortably over knee) */}
                  <path d="M124 140 Q138 152 148 162 L158 158 Q146 144 134 138 Z" fill="#1E1B4B" />

                  {/* Modern White Sneakers with #5e17eb purple accents */}
                  {/* Left Shoe */}
                  <path d="M120 152 L132 150 L136 158 L122 160 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
                  <line x1="124" y1="154" x2="130" y2="153" stroke="#5e17eb" strokeWidth="1.4" strokeLinecap="round" />
                  {/* Right Shoe (dangling in front) */}
                  <path d="M152 158 L166 156 L168 166 L154 168 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
                  <line x1="156" y1="161" x2="162" y2="160" stroke="#5e17eb" strokeWidth="1.4" strokeLinecap="round" />

                  {/* Torso & Stylish Hoodie in Base Theme #5e17eb */}
                  <path d="M98 84 C94 104 94 122 98 144 L146 144 C150 122 150 104 146 84 Z" fill="url(#hoodieGrad)" />
                  {/* Bottom ribbed hem of hoodie */}
                  <path d="M98 138 Q122 143 146 138 L146 144 L98 144 Z" fill="#450EB0" />
                  {/* Hoodie pocket curve */}
                  <path d="M106 122 Q122 128 138 122" stroke="#450EB0" strokeWidth="2" strokeLinecap="round" fill="none" />
                  {/* White drawstrings */}
                  <path d="M116 88 L116 104 M126 88 L126 104" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />

                  {/* Left & Right Arms holding the open book */}
                  {/* Left Arm */}
                  <path d="M98 88 Q82 108 102 120 L110 114 Q96 102 108 88 Z" fill="#5e17eb" />
                  {/* Right Arm */}
                  <path d="M144 88 Q158 108 140 120 L132 114 Q146 102 136 88 Z" fill="#5e17eb" />
                  {/* Hands holding the book */}
                  <circle cx="107" cy="116" r="5" fill="#F8C8A0" />
                  <circle cx="135" cy="116" r="5" fill="#F8C8A0" />

                  {/* 5. OPEN E-BOOK IN BOY'S HANDS */}
                  {/* Amber / Golden Book Cover */}
                  <path d="M121 123 L94 100 L98 96 L121 117 Z" fill="#D97706" />
                  <path d="M121 123 L148 100 L144 96 L121 117 Z" fill="#D97706" />
                  <path d="M121 123 L96 101 L97 97 L121 118 Z" fill="#FFAA00" />
                  <path d="M121 123 L146 101 L145 97 L121 118 Z" fill="#FFAA00" />
                  {/* Curved Open Pages (Left & Right Spreads in Clean White) */}
                  <path d="M121 118 Q108 113 97 98 L121 100 Z" fill="#FFFFFF" stroke="#FEF3C7" strokeWidth="0.8" />
                  <path d="M121 118 Q134 113 145 98 L121 100 Z" fill="#FFFFFF" stroke="#FEF3C7" strokeWidth="0.8" />
                  {/* Center spine line */}
                  <line x1="121" y1="100" x2="121" y2="120" stroke="#D97706" strokeWidth="1.2" />
                  {/* Reading text lines in base theme tint */}
                  <line x1="103" y1="103" x2="116" y2="106" stroke="#5e17eb" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
                  <line x1="102" y1="108" x2="115" y2="111" stroke="#5e17eb" strokeOpacity="0.30" strokeWidth="1.4" strokeLinecap="round" />
                  <line x1="126" y1="106" x2="139" y2="103" stroke="#5e17eb" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
                  <line x1="127" y1="111" x2="140" y2="108" stroke="#5e17eb" strokeOpacity="0.30" strokeWidth="1.4" strokeLinecap="round" />

                  {/* 6. HEAD, FACE & HAIR */}
                  {/* Neck */}
                  <rect x="117" y="76" width="10" height="12" fill="#F0BA8E" />

                  {/* Head & Cheerful Face looking down intently at book */}
                  <path d="M112 60 Q109 76 120 81 Q134 81 136 67 Q136 53 124 51 Z" fill="#F8C8A0" />
                  {/* Cute Ear */}
                  <circle cx="134" cy="66" r="3.5" fill="#F8C8A0" />
                  {/* Eye happily gazing downward at open pages */}
                  <path d="M118 67 Q121 70 124 67" stroke="#1E1B4B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  {/* Eyebrow */}
                  <path d="M116 63 Q120 61 124 63" stroke="#1E1B4B" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                  {/* Cheerful Smile */}
                  <path d="M119 74 Q123 77 127 73" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />

                  {/* Dark Modern Styled Hair with Subtle Purple Glow */}
                  <path
                    d="M110 60 C106 45 118 39 130 39 C142 39 148 49 141 60 C136 57 135 60 134 64 C129 57 123 57 118 62 C114 58 111 59 110 60 Z"
                    fill="#1E1B4B"
                  />
                  <path d="M128 39 C135 35 143 39 146 44 C140 44 137 47 136 50 Z" fill="#450EB0" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
