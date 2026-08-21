'use client';

import React from 'react';
import { Home, LayoutGrid, ShoppingCart, BookOpen, User } from 'lucide-react';

export type TabKey = 'home' | 'categories' | 'cart' | 'purchased' | 'profile';

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
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 sm:h-18 bg-white/95 backdrop-blur-md border-t border-gray-200/80 flex items-center justify-around px-2 sm:px-6 max-w-7xl mx-auto shadow-sm">
      {/* 1. Home Tab */}
      <button
        id="nav-tab-home"
        onClick={() => onTabChange('home')}
        className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
          activeTab === 'home' ? 'text-[#4029AB]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'home' ? 'bg-[#4029AB]/10' : ''
          }`}
        >
          <Home
            className="w-5 h-5"
            strokeWidth={activeTab === 'home' ? 2.5 : 1.75}
          />
        </div>
        <span
          className={`text-[11px] font-bold tracking-tight ${
            activeTab === 'home' ? 'text-[#4029AB]' : 'text-gray-500'
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
          activeTab === 'categories' ? 'text-[#4029AB]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'categories' ? 'bg-[#4029AB]/10' : ''
          }`}
        >
          <LayoutGrid
            className="w-5 h-5"
            strokeWidth={activeTab === 'categories' ? 2.5 : 1.75}
          />
        </div>
        <span
          className={`text-[11px] font-bold tracking-tight ${
            activeTab === 'categories' ? 'text-[#4029AB]' : 'text-gray-500'
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
          activeTab === 'cart' ? 'text-[#4029AB]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-full relative flex items-center justify-center transition-all ${
            activeTab === 'cart' ? 'bg-[#4029AB]/10' : ''
          }`}
        >
          <ShoppingCart
            className="w-5 h-5"
            strokeWidth={activeTab === 'cart' ? 2.5 : 1.75}
          />
          {cartCount > 0 && (
            <span className="absolute 0 top-0.5 right-0.5 min-w-[16px] h-4 bg-[#4029AB] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-xs">
              {cartCount}
            </span>
          )}
        </div>
        <span
          className={`text-[11px] font-bold tracking-tight ${
            activeTab === 'cart' ? 'text-[#4029AB]' : 'text-gray-500'
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
          activeTab === 'purchased' ? 'text-[#4029AB]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'purchased' ? 'bg-[#4029AB]/10' : ''
          }`}
        >
          <BookOpen
            className="w-5 h-5"
            strokeWidth={activeTab === 'purchased' ? 2.5 : 1.75}
          />
        </div>
        <span
          className={`text-[11px] font-bold tracking-tight ${
            activeTab === 'purchased' ? 'text-[#4029AB]' : 'text-gray-500'
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
          activeTab === 'profile' ? 'text-[#4029AB]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'profile' ? 'bg-[#4029AB]/10' : ''
          }`}
        >
          <User
            className="w-5 h-5"
            strokeWidth={activeTab === 'profile' ? 2.5 : 1.75}
          />
        </div>
        <span
          className={`text-[11px] font-bold tracking-tight ${
            activeTab === 'profile' ? 'text-[#4029AB]' : 'text-gray-500'
          }`}
        >
          Profile
        </span>
      </button>
    </nav>
  );
};
