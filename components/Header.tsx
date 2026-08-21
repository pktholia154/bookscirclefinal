'use client';

import React, { useState } from 'react';
import { Search, ShoppingCart, Database, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSeedModal: () => void;
  isFirebaseSynced: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  onOpenSeedModal,
  isFirebaseSynced,
}) => {
  const [showSearchInput, setShowSearchInput] = useState(false);

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
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 gap-3">
        {/* Brand Logo & Name */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#4029AB]">
            BooksCircle
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">
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

        {/* Actions (Search Toggle, Firebase Status, Cart, Profile Avatar) */}
        <div className="flex items-center gap-2.5">
          {/* Mobile Search Toggle */}
          <button
            id="mobile-search-toggle"
            onClick={() => setShowSearchInput(!showSearchInput)}
            className="md:hidden w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#4029AB] active:scale-95 transition-all"
            aria-label="Toggle Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Firebase Database Status */}
          <button
            id="firebase-status-btn"
            onClick={onOpenSeedModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all border border-gray-200"
            title="Firebase Firestore Connection"
          >
            <Database className="w-3.5 h-3.5 text-[#4029AB]" />
            <span>Firebase</span>
            {isFirebaseSynced ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-0.5" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5" />
            )}
          </button>

          {/* Cart Button with Animated Badge */}
          <button
            id="header-cart-button"
            onClick={onOpenCart}
            className="relative w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 hover:bg-[#4029AB]/10 active:scale-95 transition-all"
            aria-label="View Shopping Cart"
          >
            <ShoppingCart className="w-5 h-5 text-[#4029AB]" />
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

          {/* User Avatar Chip */}
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-[#4029AB] shadow-xs select-none">
            <div className="w-full h-full bg-[#4029AB]/10 flex items-center justify-center text-[#4029AB] text-xs font-black tracking-tight">
              BC
            </div>
          </div>
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
