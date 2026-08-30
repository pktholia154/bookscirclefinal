'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Star, Check, Heart } from 'lucide-react';
import { Book } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import { toggleWishlistAction } from '@/lib/services/wishlist';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onAddToCart: (book: Book, e: React.MouseEvent) => void;
  isInCart?: boolean;
  isPurchased?: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (book: Book, e: React.MouseEvent) => void;
  layout?: 'carousel' | 'grid';
  className?: string;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onAddToCart,
  isInCart = false,
  isPurchased = false,
  isWishlisted = false,
  onToggleWishlist,
  layout = 'carousel',
  className = '',
}) => {
  const [imgSrc, setImgSrc] = useState(book.cover || DEFAULT_BOOK_COVER);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(book, e);
    } else {
      toggleWishlistAction(book);
    }
  };

  // Calculate discount percentage
  const discountPercent =
    book.list_price && book.list_price > book.buy_price
      ? Math.round(((book.list_price - book.buy_price) / book.list_price) * 100)
      : 20;

  const rating = book.rating || 4.7;

  const containerClasses =
    layout === 'grid'
      ? `group cursor-pointer select-none flex flex-col w-full min-w-0 transition-transform active:scale-[0.98] ${className}`
      : `peekaboo-item group shrink-0 cursor-pointer select-none flex flex-col w-[calc((100vw-57px)/3.5)] min-w-[82px] max-w-[102px] sm:w-[135px] sm:min-w-[135px] sm:max-w-[135px] md:w-[160px] md:min-w-[160px] md:max-w-[160px] lg:w-[175px] lg:min-w-[175px] lg:max-w-[175px] transition-transform active:scale-[0.98] ${className}`;

  return (
    <div
      id={`book-card-${book.id}`}
      onClick={() => onSelect(book)}
      className={containerClasses}
    >
      {/* Cover Image with Wishlist (Top-Right) & Cart / Owned (Bottom-Right) Icon Overlays */}
      <div className="relative aspect-[3/4] w-full rounded-none overflow-hidden bg-gray-100 shadow-xs border border-gray-200/90">
        <Image
          src={imgSrc}
          alt={book.title}
          fill
          unoptimized
          sizes="(max-width: 640px) 100px, (max-width: 768px) 160px, 220px"
          className="object-cover rounded-none group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          onError={() => setImgSrc(DEFAULT_BOOK_COVER)}
        />

        {/* Top-Right Wishlist Heart Button */}
        <button
          id={`card-wishlist-${book.id}`}
          onClick={handleWishlistClick}
          className={`absolute top-1 right-1 sm:top-1.5 sm:right-1.5 md:top-2 md:right-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shadow-xs transition-all duration-200 active:scale-90 cursor-pointer z-10 ${
            isWishlisted
              ? 'bg-white text-rose-600 shadow-rose-200/50'
              : 'bg-white/90 text-gray-700 hover:bg-white hover:text-rose-600'
          }`}
          aria-label={isWishlisted ? `Remove ${book.title} from wishlist` : `Add ${book.title} to wishlist`}
          title={isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 transition-colors ${
              isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-gray-700'
            }`}
          />
        </button>

        {/* Circular Cart or Owned Button Overlay at Bottom-Right of Cover */}
        {isPurchased ? (
          <div
            id={`card-owned-badge-${book.id}`}
            className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 md:bottom-2 md:right-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shadow-xs bg-emerald-600 text-white"
            title="You own this eBook"
          >
            <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 stroke-[2.5]" />
          </div>
        ) : (
          <button
            id={`card-add-cart-${book.id}`}
            onClick={(e) => onAddToCart(book, e)}
            className={`absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 md:bottom-2 md:right-2 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shadow-xs transition-all duration-200 active:scale-90 cursor-pointer ${
              isInCart
                ? 'bg-[#4029AB] text-white ring-2 ring-white'
                : 'bg-white/95 text-gray-900 hover:bg-[#4029AB] hover:text-white'
            }`}
            aria-label={isInCart ? `Remove ${book.title} from cart` : `Add ${book.title} to cart`}
            title={isInCart ? 'In Cart (Click to toggle)' : 'Add to Cart'}
          >
            {isInCart ? (
              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 stroke-[2.5]" />
            ) : (
              <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 stroke-[2.2]" />
            )}
          </button>
        )}
      </div>

      {/* Dominating Pricing & Discount Tag */}
      <div className="flex items-baseline gap-1 mt-1.5 min-w-0">
        <span className="font-black text-xs sm:text-sm md:text-base lg:text-lg text-gray-950 tracking-tight leading-none">
          ₹{book.buy_price}
        </span>
        {discountPercent > 0 && (
          <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-emerald-600 leading-none">
            {discountPercent}% OFF
          </span>
        )}
      </div>

      {/* Book Title (Single row truncated, responsive font size, overflow guarded) */}
      <h3
        className="text-[11px] sm:text-xs md:text-sm font-bold text-gray-900 truncate leading-snug mt-1 group-hover:text-[#4029AB] transition-colors w-full min-w-0"
        title={book.title}
      >
        {book.title}
      </h3>

      {/* Category Subtitle */}
      <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 font-medium truncate mt-0.5 w-full min-w-0">
        {book.category || 'Exam Guide'}
      </p>

      {/* Star Rating & Numeric Rating */}
      <div className="flex items-center gap-0.5 sm:gap-1 mt-1 text-amber-500 min-w-0">
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 ${
                i < Math.floor(rating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-gray-400">
          {rating.toFixed(1)}
        </span>
      </div>
    </div>
  );
};
