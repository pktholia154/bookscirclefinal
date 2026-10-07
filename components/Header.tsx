'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, ShoppingCart, X, LogIn, Sparkles, Download, Upload } from 'lucide-react';
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
  onNavigateToHome?: () => void;
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
  onNavigateToHome,
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [logoTimestamp, setLogoTimestamp] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const uploadLogoFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setLogoTimestamp(Date.now());
      }
    } catch (e) {
      console.warn('Upload logo error:', e);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadLogoFile(file);
    }
  };

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        uploadLogoFile(file);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all">
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-[#4029AB]/80 backdrop-blur-xs flex items-center justify-center p-6 pointer-events-none">
          <div className="bg-white rounded-2xl p-6 text-center max-w-sm shadow-2xl flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-[#4029AB] animate-bounce" />
            <h3 className="font-bold text-gray-900 text-lg">Drop your logo file here</h3>
            <p className="text-xs text-gray-500">Drop booksCircle (2).png to update the logo directly.</p>
          </div>
        </div>
      )}

      {/* Main Top Header Bar (Brand + Actions) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 gap-2 sm:gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 select-none group">
          <div
            onClick={() => {
              if (onNavigateToHome) onNavigateToHome();
              else onNavigateToProfile();
            }}
            className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 transition-transform group-hover:scale-105 cursor-pointer"
          >
            <Image
              src={logoTimestamp ? `/booksCircle (2).png?v=${logoTimestamp}` : '/booksCircle (2).png'}
              alt="BooksCircle Logo"
              fill
              priority
              unoptimized
              className="object-contain rounded-md"
            />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            title="Upload exact logo file directly"
            className="p-1 rounded-full text-gray-400 hover:text-[#4029AB] hover:bg-gray-100 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoFileChange}
          />

          <h1
            onClick={() => {
              if (onNavigateToHome) onNavigateToHome();
              else onNavigateToProfile();
            }}
            className="text-xl sm:text-2xl font-black tracking-tight text-[#4029AB] leading-none cursor-pointer"
          >
            BooksCircle
          </h1>
        </div>

        {/* Desktop Embedded Search Bar */}
        <div className="hidden md:flex flex-1 max-w-sm mx-4 py-1">
          <div
            onClick={handleSearchClick}
            className="relative w-full group cursor-pointer"
          >
            <div className="relative flex items-center w-full bg-white border-2 border-gray-300 group-hover:border-[#4029AB]/70 rounded-xl px-3.5 py-2 transition-all shadow-sm">
              <Search className="w-4 h-4 text-[#4029AB] shrink-0 mr-2" />

              <input
                id="desktop-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={handleSearchClick}
                placeholder="Search..."
                className="w-full text-sm bg-transparent text-gray-900 font-medium focus:outline-none placeholder-transparent"
              />

              {/* Animated Floating Label inside search bar */}
              {!searchQuery && (
                <div className="absolute left-9 right-6 pointer-events-none flex items-center overflow-hidden h-5">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIndex}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -12, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="text-sm text-gray-400 font-normal truncate block"
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
              <span className="leading-none">Install Now</span>
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
      <div className="md:hidden px-4 pb-3.5 pt-1.5">
        <div
          onClick={handleSearchClick}
          className="relative w-full cursor-pointer group"
        >
          <div className="relative flex items-center w-full bg-white hover:bg-gray-50 border-2 border-gray-300 group-hover:border-[#4029AB]/70 rounded-xl px-4 py-3 transition-all shadow-sm">
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
              className="w-full text-sm bg-transparent text-gray-950 font-medium focus:outline-none placeholder-transparent"
            />

            {/* Animated Floating Label inside Mobile Search Bar */}
            {!searchQuery && (
              <div className="absolute left-11 right-20 pointer-events-none flex items-center overflow-hidden h-5">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIndex}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="text-sm text-gray-400 font-normal truncate block"
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
