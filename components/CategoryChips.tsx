'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Category } from '@/lib/types';

interface CategoryChipsProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  initialVisibleCount?: number;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategory = 'all',
  onSelectCategory,
  initialVisibleCount = 7,
}) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const hasMore = categories.length > initialVisibleCount;
  const visibleCategories = isExpanded ? categories : categories.slice(0, initialVisibleCount);

  const handleCategoryClick = (cat: Category, e: React.MouseEvent) => {
    const slug = cat.seolsug || cat.id;
    if (onSelectCategory) {
      onSelectCategory(cat.title);
    }
    router.push(`/category/${encodeURIComponent(slug)}`);
  };

  return (
    <div className="w-full py-2.5 px-4 sm:px-6">
      {/* Wrapped Category Chips Layout */}
      <div className="flex flex-wrap items-center gap-2">
        {/* "All" Chip */}
        <Link
          id="chip-all"
          href="/"
          className={`shrink-0 px-4 py-2 rounded-full text-sm sm:text-[15px] font-bold transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
            selectedCategory.toLowerCase() === 'all'
              ? 'bg-[#4029AB] text-white border border-[#4029AB] shadow-xs'
              : 'bg-gray-100 text-gray-800 border border-transparent hover:bg-gray-200'
          }`}
        >
          All
        </Link>

        {/* Category Chips (linking directly to SEO ready /category/[slug]) */}
        {visibleCategories.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.title.toLowerCase();
          const slug = cat.seolsug || cat.id;

          return (
            <Link
              key={cat.id}
              id={`chip-${slug}`}
              href={`/category/${encodeURIComponent(slug)}`}
              className={`shrink-0 px-4 py-2 rounded-full text-sm sm:text-[15px] font-bold transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[#4029AB] text-white border border-[#4029AB] shadow-xs'
                  : 'bg-gray-100 text-gray-800 border border-transparent hover:bg-gray-200'
              }`}
            >
              {cat.title}
            </Link>
          );
        })}

        {/* See More / Show Less Toggle Button */}
        {hasMore && (
          <button
            id="chip-see-more-toggle"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="shrink-0 px-4 py-2 rounded-full text-sm sm:text-[15px] font-bold text-[#4029AB] bg-[#4029AB]/10 hover:bg-[#4029AB]/15 border border-[#4029AB]/20 flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer"
            aria-label={isExpanded ? 'Show fewer categories' : 'See more categories'}
          >
            <span>{isExpanded ? 'Show less' : `See more (+${categories.length - initialVisibleCount})`}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};


