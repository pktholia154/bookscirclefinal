'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Star } from 'lucide-react';
import { Book } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onAddToCart: (book: Book, e: React.MouseEvent) => void;
  isInCart?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onAddToCart,
  isInCart = false,
}) => {
  const [imgSrc, setImgSrc] = useState(book.cover || DEFAULT_BOOK_COVER);

  // Calculate discount percentage
  const discountPercent =
    book.list_price && book.list_price > book.buy_price
      ? Math.round(((book.list_price - book.buy_price) / book.list_price) * 100)
      : 20;

  const rating = book.rating || 4.7;

  return (
    <div
      id={`book-card-${book.id}`}
      onClick={() => onSelect(book)}
      className="peekaboo-item group shrink-0 cursor-pointer select-none flex flex-col w-[calc((100vw-57px)/3.5)] min-w-[82px] max-w-[102px] sm:w-[135px] sm:min-w-[135px] sm:max-w-[135px] md:w-[160px] md:min-w-[160px] md:max-w-[160px] lg:w-[175px] lg:min-w-[175px] lg:max-w-[175px] transition-transform active:scale-[0.98]"
    >
      {/* Cover Image with Price Badge & Cart Icon Overlay */}
      <div className="relative aspect-[2/3] w-full rounded-none overflow-hidden bg-gray-100 shadow-xs border border-gray-200">
        <Image
          src={imgSrc}
          alt={book.title}
          fill
          sizes="(max-width: 640px) 100px, (max-width: 768px) 140px, 175px"
          className="object-cover rounded-none group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          onError={() => setImgSrc(DEFAULT_BOOK_COVER)}
        />


        {/* Top-Right Price / Badge */}
        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 bg-[#4029AB] text-white text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs leading-none">
          ₹{book.buy_price}
        </div>

        {/* Circular Cart Button Overlay at Bottom-Right of Cover */}
        <button
          id={`card-add-cart-${book.id}`}
          onClick={(e) => onAddToCart(book, e)}
          className={`absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-90 ${
            isInCart
              ? 'bg-[#4029AB] text-white'
              : 'bg-white/95 text-gray-900 hover:bg-[#4029AB] hover:text-white'
          }`}
          aria-label={`Add ${book.title} to cart`}
        >
          <ShoppingCart className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
        </button>
      </div>

      {/* Pricing & Discount Tag */}
      <div className="flex items-baseline gap-1 mt-1">
        <span className="font-bold text-[11px] sm:text-sm text-gray-900 tracking-tight">
          ₹{book.buy_price}
        </span>
        {discountPercent > 0 && (
          <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 leading-none">
            {discountPercent}% OFF
          </span>
        )}
      </div>

      {/* Book Title (2 rows max) */}
      <h3 className="text-[10px] sm:text-xs font-bold text-gray-900 line-clamp-2 leading-tight mt-0.5 group-hover:text-[#4029AB] transition-colors">
        {book.title}
      </h3>

      {/* Category Subtitle */}
      <p className="text-[9px] sm:text-xs text-gray-400 font-medium truncate mt-0.5">
        {book.category || 'Exam Guide'}
      </p>

      {/* Star Rating & Numeric Rating */}
      <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 text-amber-500">
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-2 h-2 sm:w-3 sm:h-3 ${
                i < Math.floor(rating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-[8px] sm:text-[10px] font-medium text-gray-400">
          {rating.toFixed(1)}
        </span>
      </div>
    </div>
  );
};
