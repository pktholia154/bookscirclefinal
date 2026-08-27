'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Book } from '@/lib/types';
import { BookCard } from './BookCard';

interface CarouselSectionProps {
  title: string;
  books: Book[];
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e?: React.MouseEvent) => void;
  onBuyNow?: (book: Book) => void;
  cartBookIds: Set<string>;
  purchasedBookIds?: string[];
  sectionId: string;
  onViewAll?: () => void;
}

export const CarouselSection: React.FC<CarouselSectionProps> = ({
  title,
  books,
  onSelectBook,
  onAddToCart,
  onBuyNow,
  cartBookIds,
  purchasedBookIds = [],
  sectionId,
  onViewAll,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!books || books.length === 0) return null;

  return (
    <section id={sectionId} className="w-full py-3">
      {/* Section Header: Title & View All */}
      <div className="flex justify-between items-end mb-2.5 px-4 sm:px-6">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 tracking-tight">
          {title}
        </h2>

        <div className="flex items-center gap-3">
          <button
            onClick={onViewAll}
            className="text-xs sm:text-sm font-semibold text-[#4029AB] hover:underline cursor-pointer transition-colors"
          >
            View All
          </button>

          {/* Desktop Carousel Arrows */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
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
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onSelect={onSelectBook}
            onAddToCart={onAddToCart}
            isInCart={cartBookIds.has(book.id)}
            isPurchased={purchasedBookIds.includes(book.id)}
          />
        ))}
      </div>
    </section>
  );
};
