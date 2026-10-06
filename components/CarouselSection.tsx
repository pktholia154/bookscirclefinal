'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Book } from '@/lib/types';
import { BookCard } from './BookCard';

interface CarouselSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  limit?: number;
  books: Book[];
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e?: React.MouseEvent) => void;
  onBuyNow?: (book: Book) => void;
  cartBookIds: Set<string>;
  purchasedBookIds?: string[];
  wishlistBookIds?: Set<string>;
  onToggleWishlist?: (book: Book, e: React.MouseEvent) => void;
  sectionId?: string;
  onViewAll?: () => void;
  viewAllHref?: string;
}

export const CarouselSection: React.FC<CarouselSectionProps> = ({
  title,
  subtitle,
  badge,
  limit,
  books,
  onSelectBook,
  onAddToCart,
  onBuyNow,
  cartBookIds,
  purchasedBookIds = [],
  wishlistBookIds = new Set(),
  onToggleWishlist,
  sectionId,
  onViewAll,
  viewAllHref,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const displayBooks = limit && limit > 0 ? books.slice(0, limit) : books.slice(0, 12);

  if (!displayBooks || displayBooks.length === 0) return null;

  return (
    <section id={sectionId} className="w-full py-3">
      {/* Section Header: Title, Badge, Subtitle & View All */}
      <div className="flex justify-between items-end mb-2.5 px-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 tracking-tight truncate">
              {title}
            </h2>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4029AB]/10 text-[#4029AB] shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 font-normal truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-xs sm:text-sm font-semibold text-[#4029AB] hover:underline transition-colors"
            >
              View All
            </Link>
          ) : onViewAll ? (
            <button
              onClick={onViewAll}
              className="text-xs sm:text-sm font-semibold text-[#4029AB] hover:underline cursor-pointer transition-colors"
            >
              View All
            </button>
          ) : null}

          {/* Desktop Carousel Arrows */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel with 3.5 books peekaboo on mobile */}
      <div
        ref={scrollRef}
        className="flex items-start gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar px-4 sm:px-6 pb-2 scroll-smooth peekaboo-scroll"
      >
        {displayBooks.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onSelect={onSelectBook}
            onAddToCart={onAddToCart}
            isInCart={cartBookIds.has(book.id)}
            isPurchased={purchasedBookIds.includes(book.id)}
            isWishlisted={wishlistBookIds.has(book.id)}
            onToggleWishlist={onToggleWishlist}
          />
        ))}
      </div>
    </section>
  );
};
