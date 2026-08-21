'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Category } from '@/lib/types';

interface CategoryChipsProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  initialVisibleCount?: number;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  initialVisibleCount = 7,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // If selected category is outside visible range, auto-expand or include it
  const hasMore = categories.length > initialVisibleCount;
  const visibleCategories = isExpanded ? categories : categories.slice(0, initialVisibleCount);

  return (
    <div className="w-full py-2.5 px-4 sm:px-6">
      {/* Wrapped Category Chips Layout */}
      <div className="flex flex-wrap items-center gap-2">
        {/* "All" Chip */}
        <button
          id="chip-all"
          onClick={() => onSelectCategory('all')}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
            selectedCategory.toLowerCase() === 'all'
              ? 'bg-[#4029AB] text-white border border-[#4029AB] shadow-xs'
              : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
          }`}
        >
          All
        </button>

        {/* Category Chips (at least 7 visible by default) */}
        {visibleCategories.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.title.toLowerCase();
          return (
            <button
              key={cat.id}
              id={`chip-${cat.seolsug || cat.id}`}
              onClick={() => onSelectCategory(cat.title)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[#4029AB] text-white border border-[#4029AB] shadow-xs'
                  : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
              }`}
            >
              {cat.title}
            </button>
          );
        })}

        {/* See More / Show Less Toggle Button */}
        {hasMore && (
          <button
            id="chip-see-more-toggle"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold text-[#4029AB] bg-[#4029AB]/10 hover:bg-[#4029AB]/15 border border-[#4029AB]/20 flex items-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer"
            aria-label={isExpanded ? 'Show fewer categories' : 'See more categories'}
          >
            <span>{isExpanded ? 'Show less' : `See more (+${categories.length - initialVisibleCount})`}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

