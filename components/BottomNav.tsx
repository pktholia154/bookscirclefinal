'use client';

import React from 'react';
import { Home, BookMarked, ShoppingBag, User } from 'lucide-react';

export type TabKey = 'home' | 'library' | 'store' | 'account';

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
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 sm:h-20 bg-white/95 backdrop-blur-md border-t border-gray-100 flex items-center justify-around px-6 max-w-7xl mx-auto shadow-sm">
      {/* Home Tab */}
      <button
        id="nav-tab-home"
        onClick={() => onTabChange('home')}
        className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${
          activeTab === 'home' ? 'text-[#4029AB]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Home
          className="w-5 h-5 sm:w-6 sm:h-6"
          strokeWidth={activeTab === 'home' ? 2.5 : 1.75}
          fill={activeTab === 'home' ? '#4029AB' : 'none'}
        />
        <span
          className={`text-[10px] font-bold uppercase tracking-tight ${
            activeTab === 'home' ? 'text-[#4029AB]' : 'text-gray-400'
          }`}
        >
          Home
        </span>
      </button>

      {/* Library Tab */}
      <button
        id="nav-tab-library"
        onClick={() => onTabChange('library')}
        className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${
          activeTab === 'library' ? 'text-[#4029AB]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <BookMarked
          className="w-5 h-5 sm:w-6 sm:h-6"
          strokeWidth={activeTab === 'library' ? 2.5 : 1.75}
          fill={activeTab === 'library' ? '#4029AB' : 'none'}
        />
        <span
          className={`text-[10px] font-bold uppercase tracking-tight ${
            activeTab === 'library' ? 'text-[#4029AB]' : 'text-gray-400'
          }`}
        >
          Library
        </span>
      </button>

      {/* Store Tab */}
      <button
        id="nav-tab-store"
        onClick={() => onTabChange('store')}
        className={`relative flex flex-col items-center gap-1 transition-all active:scale-95 ${
          activeTab === 'store' ? 'text-[#4029AB]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <ShoppingBag
          className="w-5 h-5 sm:w-6 sm:h-6"
          strokeWidth={activeTab === 'store' ? 2.5 : 1.75}
          fill={activeTab === 'store' ? '#4029AB' : 'none'}
        />
        {cartCount > 0 && (
          <span className="absolute -top-1 right-2 w-2 h-2 bg-[#4029AB] rounded-full" />
        )}
        <span
          className={`text-[10px] font-bold uppercase tracking-tight ${
            activeTab === 'store' ? 'text-[#4029AB]' : 'text-gray-400'
          }`}
        >
          Store
        </span>
      </button>

      {/* Account Tab */}
      <button
        id="nav-tab-account"
        onClick={() => onTabChange('account')}
        className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${
          activeTab === 'account' ? 'text-[#4029AB]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <User
          className="w-5 h-5 sm:w-6 sm:h-6"
          strokeWidth={activeTab === 'account' ? 2.5 : 1.75}
          fill={activeTab === 'account' ? '#4029AB' : 'none'}
        />
        <span
          className={`text-[10px] font-bold uppercase tracking-tight ${
            activeTab === 'account' ? 'text-[#4029AB]' : 'text-gray-400'
          }`}
        >
          Account
        </span>
      </button>
    </nav>
  );
};
