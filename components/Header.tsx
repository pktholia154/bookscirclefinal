'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Search, ShoppingCart, X, LogIn, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isTestAccount?: boolean;
}

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentUser: UserProfile | null;
  onGoogleSignIn: () => void;
  onNavigateToProfile: () => void;
}

// Crisp Google 'G' vector icon component
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  currentUser,
  onGoogleSignIn,
  onNavigateToProfile,
}) => {
  const [showSearchInput, setShowSearchInput] = useState(false);

  const userInitial =
    currentUser?.displayName?.charAt(0).toUpperCase() ||
    currentUser?.email?.charAt(0).toUpperCase() ||
    'U';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all">
      {/* Top Mobile Status Simulated Bar */}
      <div className="w-full flex justify-between items-center px-6 pt-2 pb-1 text-[10px] font-bold text-gray-400 select-none">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 border border-gray-400 rounded-full" />
          <div className="w-2.5 h-2.5 border border-gray-400 rounded-full" />
          <div className="w-4 h-2.5 bg-gray-400 rounded-xs" />
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 gap-3">
        {/* Brand Logo & Name */}
        <div onClick={onNavigateToProfile} className="cursor-pointer select-none">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#4029AB]">
            BooksCircle
          </h1>
          <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">
            Curated Library
          </p>
        </div>

        {/* Search Bar (Desktop / Expanded) */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="desktop-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search UPSC, SSC, Banking, Engineering..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#4029AB] focus:bg-white transition-all text-gray-900 placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Actions (Search Toggle, Google Sign In / Account, Cart) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Mobile Search Toggle */}
          <button
            id="mobile-search-toggle"
            onClick={() => setShowSearchInput(!showSearchInput)}
            className="md:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#4029AB] active:scale-95 transition-all"
            aria-label="Toggle Search"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Login / User Profile Action */}
          {currentUser ? (
            <button
              id="header-user-profile-btn"
              onClick={onNavigateToProfile}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 hover:border-[#4029AB]/30 hover:bg-gray-100 transition-all cursor-pointer select-none group"
              title={`Logged in as ${currentUser.displayName || currentUser.email}`}
            >
              {currentUser.photoURL ? (
                <div className="relative w-7 h-7 rounded-full overflow-hidden border border-gray-200">
                  <Image
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    fill
                    sizes="28px"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-black">
                  {userInitial}
                </div>
              )}
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-[11px] font-bold text-gray-900 leading-none truncate max-w-[100px]">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <span className="text-[9px] font-semibold text-emerald-600 leading-tight flex items-center gap-0.5">
                  Verified Reader
                </span>
              </div>
            </button>
          ) : (
            <button
              id="header-login-btn"
              onClick={onGoogleSignIn}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-[#4029AB] hover:bg-[#34208e] active:scale-95 transition-all shadow-xs cursor-pointer"
              title="Log in to BooksCircle"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Login</span>
            </button>
          )}

          {/* Cart Button with Animated Badge */}
          <button
            id="header-cart-button"
            onClick={onOpenCart}
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 hover:bg-[#4029AB]/10 active:scale-95 transition-all cursor-pointer"
            aria-label="View Shopping Cart"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-[#4029AB]" />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#4029AB] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm"
              >
                {cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Expansion */}
      <AnimatePresence>
        {showSearchInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden px-6 pb-3 pt-1 overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="mobile-search-input"
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search PDF books, exams, topics..."
                className="w-full pl-9 pr-9 py-2 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#4029AB] focus:bg-white text-gray-900 placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
