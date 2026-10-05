'use client';

import React from 'react';
import { Home, LayoutGrid, ShoppingCart, BookOpen, User } from 'lucide-react';

export type TabKey = 'home' | 'categories' | 'cart' | 'purchased' | 'profile' | 'search' | 'book' | '';

interface BottomNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  cartCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  cartCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 sm:h-18 bg-white/95 backdrop-blur-md border-t-2 md:border-x-2 border-gray-200 flex items-center justify-around px-2 sm:px-6 max-w-2xl lg:max-w-3xl mx-auto shadow-md">
      {/* 1. Home Tab */}
      <button
        id="nav-tab-home"
        onClick={() => onTabChange('home')}
        className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
          activeTab === 'home' ? 'text-[#5e17eb]' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <div
          className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border-2 flex items-center justify-center transition-all ${
            activeTab === 'home'
              ? 'border-[#5e17eb] bg-[#5e17eb]/10 text-[#5e17eb] shadow-xs'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
          }`}
        >
          <Home
            className="w-5 h-5"
            strokeWidth={activeTab === 'home' ? 2.5 : 2.2}
          />
        </div>
        <span
          className={`text-xs font-bold tracking-tight ${
            activeTab === 'home' ? 'text-[#5e17eb]' : 'text-gray-600'
          }`}
        >
          Home
        </span>
      </button>

      {/* 2. Categories Tab */}
      <button
        id="nav-tab-categories"
        onClick={() => onTabChange('categories')}
        className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
          activeTab === 'categories' ? 'text-[#5e17eb]' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <div
          className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border-2 flex items-center justify-center transition-all ${
            activeTab === 'categories'
              ? 'border-[#5e17eb] bg-[#5e17eb]/10 text-[#5e17eb] shadow-xs'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
          }`}
        >
          <LayoutGrid
            className="w-5 h-5"
            strokeWidth={activeTab === 'categories' ? 2.5 : 2.2}
          />
        </div>
        <span
          className={`text-xs font-bold tracking-tight ${
            activeTab === 'categories' ? 'text-[#5e17eb]' : 'text-gray-600'
          }`}
        >
          Categories
        </span>
      </button>

      {/* 3. Cart Tab */}
      <button
        id="nav-tab-cart"
        onClick={() => onTabChange('cart')}
        className={`flex-1 py-1 relative flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
          activeTab === 'cart' ? 'text-[#5e17eb]' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <div
          className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border-2 relative flex items-center justify-center transition-all ${
            activeTab === 'cart'
              ? 'border-[#5e17eb] bg-[#5e17eb]/10 text-[#5e17eb] shadow-xs'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
          }`}
        >
          <ShoppingCart
            className="w-5 h-5"
            strokeWidth={activeTab === 'cart' ? 2.5 : 2.2}
          />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#5e17eb] text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-xs border-2 border-white">
              {cartCount}
            </span>
          )}
        </div>
        <span
          className={`text-xs font-bold tracking-tight ${
            activeTab === 'cart' ? 'text-[#5e17eb]' : 'text-gray-600'
          }`}
        >
          Cart
        </span>
      </button>

      {/* 4. Purchased Tab */}
      <button
        id="nav-tab-purchased"
        onClick={() => onTabChange('purchased')}
        className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
          activeTab === 'purchased' ? 'text-[#5e17eb]' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <div
          className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border-2 flex items-center justify-center transition-all ${
            activeTab === 'purchased'
              ? 'border-[#5e17eb] bg-[#5e17eb]/10 text-[#5e17eb] shadow-xs'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
          }`}
        >
          <BookOpen
            className="w-5 h-5"
            strokeWidth={activeTab === 'purchased' ? 2.5 : 2.2}
          />
        </div>
        <span
          className={`text-xs font-bold tracking-tight ${
            activeTab === 'purchased' ? 'text-[#5e17eb]' : 'text-gray-600'
          }`}
        >
          Purchased
        </span>
      </button>

      {/* 5. Profile Tab */}
      <button
        id="nav-tab-profile"
        onClick={() => onTabChange('profile')}
        className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
          activeTab === 'profile' ? 'text-[#5e17eb]' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <div
          className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border-2 flex items-center justify-center transition-all ${
            activeTab === 'profile'
              ? 'border-[#5e17eb] bg-[#5e17eb]/10 text-[#5e17eb] shadow-xs'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
          }`}
        >
          <User
            className="w-5 h-5"
            strokeWidth={activeTab === 'profile' ? 2.5 : 2.2}
          />
        </div>
        <span
          className={`text-xs font-bold tracking-tight ${
            activeTab === 'profile' ? 'text-[#5e17eb]' : 'text-gray-600'
          }`}
        >
          Profile
        </span>
      </button>
    </nav>
  );
};
