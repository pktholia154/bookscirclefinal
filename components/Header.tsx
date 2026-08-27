'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, ShoppingCart, X, LogIn, Sparkles, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentUser: UserProfile | null;
  onGoogleSignIn: () => void;
  onNavigateToProfile: () => void;
  onOpenDedicatedSearch?: () => void;
  isInstallable?: boolean;
  onInstall?: () => void;
}

const ANIMATED_PLACEHOLDERS = [
  'Search 500+ UPSC, SSC & Banking PDFs...',
  'Search "Atomic Habits", "General Studies"...',
  'Search Quantitative Aptitude, Reasoning & CSAT...',
  'Search Civil, Mechanical & Electrical Engineering...',
  'Search UPSC Prelims & Mains Handbooks...',
  'Search NCERT & State Govt Exam Guides...',
  'Search by exam, author, topic or keyword...',
];

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  currentUser,
  onGoogleSignIn,
  onNavigateToProfile,
  onOpenDedicatedSearch,
  isInstallable = false,
  onInstall,
}) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Cycling animated placeholder to entice user attention
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

  const handleSearchClick = () => {
    if (onOpenDedicatedSearch) {
      onOpenDedicatedSearch();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all">
      {/* Main Top Header Bar (Brand + Actions) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 gap-2 sm:gap-3">
        {/* Brand Logo & Name */}
        <div onClick={onNavigateToProfile} className="flex items-center gap-2 cursor-pointer select-none group">
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 shrink-0 transition-transform group-hover:scale-105">
            <Image
              src="/logo.svg"
              alt="BooksCircle Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#4029AB] leading-none">
            BooksCircle
          </h1>
        </div>

        {/* Desktop Embedded Search Bar */}
        <div className="hidden md:flex flex-1 max-w-sm mx-4">
          <div
            onClick={handleSearchClick}
            className="relative w-full group cursor-pointer"
          >
            <div className="relative flex items-center w-full bg-gray-50/80 hover:bg-gray-50 border border-gray-200 group-hover:border-[#4029AB]/60 rounded-full px-3 py-1.5 transition-all shadow-2xs">
              <Search className="w-3.5 h-3.5 text-[#4029AB] shrink-0 mr-2" />

              <input
                id="desktop-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={handleSearchClick}
                placeholder="Search..."
                className="w-full text-xs bg-transparent text-gray-900 font-medium focus:outline-none placeholder-transparent"
              />

              {/* Animated Floating Label inside search bar */}
              {!searchQuery && (
                <div className="absolute left-8 right-6 pointer-events-none flex items-center overflow-hidden h-5">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIndex}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -12, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="text-xs text-gray-400 font-normal truncate block"
                    >
                      {ANIMATED_PLACEHOLDERS[placeholderIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}

              {searchQuery && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearchChange('');
                  }}
                  className="w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions (Install + Login / Account + Cart) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* PWA Install Button: Visible only when not installed / not in standalone */}
          {isInstallable && onInstall && (
            <button
              id="header-install-app-btn"
              onClick={onInstall}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-black text-[#4029AB] bg-[#4029AB]/10 hover:bg-[#4029AB]/20 active:scale-95 transition-all shadow-2xs border border-[#4029AB]/20 cursor-pointer"
              title="Add BooksCircle to Home Screen"
            >
              <Download className="w-3.5 h-3.5 text-[#4029AB] shrink-0 stroke-[2.5]" />
              <span className="leading-none">Install</span>
            </button>
          )}

          {/* Login / User Profile Action */}
          {currentUser ? (
            <button
              id="header-user-profile-btn"
              onClick={onNavigateToProfile}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-gray-50 border border-gray-200 hover:border-[#4029AB]/30 hover:bg-gray-100 transition-all cursor-pointer select-none group"
              title={`Logged in as ${currentUser.displayName || currentUser.email}`}
            >
              {currentUser.photoURL ? (
                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-gray-200">
                  <Image
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    fill
                    sizes="24px"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-[10px] font-black">
                  {userInitial}
                </div>
              )}
              <span className="hidden sm:inline text-[11px] font-bold text-gray-900 leading-none truncate max-w-[80px]">
                {currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0]}
              </span>
            </button>
          ) : (
            <button
              id="header-login-btn"
              onClick={onGoogleSignIn}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-[#4029AB] hover:bg-[#34208e] active:scale-95 transition-all shadow-xs cursor-pointer"
              title="Log in to BooksCircle"
            >
              <LogIn className="w-3 h-3 shrink-0" />
              <span>Login</span>
            </button>
          )}

          {/* Cart Button with Animated Badge */}
          <button
            id="header-cart-button"
            onClick={onOpenCart}
            className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 hover:bg-[#4029AB]/10 active:scale-95 transition-all cursor-pointer"
            aria-label="View Shopping Cart"
          >
            <ShoppingCart className="w-4 h-4 text-[#4029AB]" />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#4029AB] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-xs"
              >
                {cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      {/* Prominent Stylish Search Bar for Mobile (Always Visible & Highly Enticing) */}
      <div className="md:hidden px-4 pb-2.5 pt-0.5">
        <div
          onClick={handleSearchClick}
          className="relative w-full cursor-pointer group"
        >
          <div className="relative flex items-center w-full bg-gray-50 hover:bg-gray-100/80 border-2 border-gray-200/90 group-hover:border-[#4029AB]/60 rounded-full px-3.5 py-2 transition-all shadow-2xs">
            {/* Search Icon with Animated Sparkle Accent */}
            <div className="flex items-center gap-1 mr-2 shrink-0">
              <Search className="w-4 h-4 text-[#4029AB]" />
            </div>

            <input
              id="mobile-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={handleSearchClick}
              placeholder="Search..."
              className="w-full text-xs bg-transparent text-gray-950 font-medium focus:outline-none placeholder-transparent"
            />

            {/* Animated Floating Label inside Mobile Search Bar */}
            {!searchQuery && (
              <div className="absolute left-10 right-20 pointer-events-none flex items-center overflow-hidden h-5">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIndex}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="text-xs text-gray-400 font-normal truncate block"
                  >
                    {ANIMATED_PLACEHOLDERS[placeholderIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}

            {/* Micro Explore / Search Pill Indicator */}
            {!searchQuery ? (
              <span className="shrink-0 text-[10px] font-bold text-[#4029AB] bg-[#4029AB]/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Explore</span>
              </span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSearchChange('');
                }}
                className="w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors shrink-0"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
