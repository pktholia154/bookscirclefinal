'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Check, Heart, ChevronRight } from 'lucide-react';
import { Book } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import { loadRazorpayScript } from '@/lib/services/razorpay';
import { toggleWishlistAction } from '@/lib/services/wishlist';

interface BookListViewProps {
  books: Book[];
  title?: string;
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e: React.MouseEvent) => void;
  onBuyNow?: (book: Book) => void;
  cartBookIds: Set<string>;
  purchasedBookIds?: string[];
  wishlistBookIds?: Set<string>;
  onToggleWishlist?: (book: Book, e: React.MouseEvent) => void;
  onViewAll?: () => void;
  viewAllHref?: string;
  limit?: number;
}

const BookListItem: React.FC<{
  book: Book;
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e: React.MouseEvent) => void;
  onBuyNow?: (book: Book) => void;
  inCart: boolean;
  isPurchased: boolean;
  isWishlisted: boolean;
  onToggleWishlist?: (book: Book, e: React.MouseEvent) => void;
}> = ({
  book,
  onSelectBook,
  onAddToCart,
  onBuyNow,
  inCart,
  isPurchased,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [imgSrc, setImgSrc] = useState(book.cover || DEFAULT_BOOK_COVER);

  const handlePreload = () => {
    loadRazorpayScript().catch(() => {});
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(book, e);
    } else {
      toggleWishlistAction(book);
    }
  };

  return (
    <div
      id={`list-item-${book.id}`}
      onClick={() => onSelectBook(book)}
      onMouseEnter={handlePreload}
      onTouchStart={handlePreload}
      className="group flex items-start gap-3.5 sm:gap-4 bg-transparent p-2 sm:p-3.5 rounded-2xl border border-gray-100 hover:border-[#4029AB]/30 hover:bg-gray-50/50 cursor-pointer transition-all active:scale-[0.99]"
    >
      {/* Book Cover Thumbnail: Aligned to top, 3:4 ratio, sharp corners with Wishlist icon on top right */}
      <div className="relative w-14 sm:w-16 aspect-[3/4] rounded-none overflow-hidden shrink-0 self-start bg-gray-200 shadow-2xs border border-gray-200">
        <Image
          src={imgSrc}
          alt={book.title}
          fill
          unoptimized
          sizes="(max-width: 640px) 64px, 80px"
          className="object-cover rounded-none group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          onError={() => setImgSrc(DEFAULT_BOOK_COVER)}
        />

        {/* Wishlist Heart button on top right of thumbnail */}
        <button
          id={`list-wishlist-${book.id}`}
          onClick={handleWishlistClick}
          className={`absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-90 cursor-pointer z-10 ${
            isWishlisted
              ? 'bg-white text-rose-600'
              : 'bg-white/80 text-gray-700 hover:bg-white hover:text-rose-600'
          }`}
          aria-label={isWishlisted ? `Remove ${book.title} from wishlist` : `Add ${book.title} to wishlist`}
          title={isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-colors ${
              isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-gray-700'
            }`}
          />
        </button>
      </div>

      {/* Middle Information Column */}
      <div className="flex-1 min-w-0 pr-1">
        {/* 2-row Title */}
        <h3 className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-snug group-hover:text-[#4029AB] transition-colors">
          {book.title}
        </h3>

        {/* Category, Language & Type in same row */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate mt-1">
          <span className="font-medium text-gray-600">{book.category || 'General'}</span>
          <span className="text-gray-300 text-[9px]">•</span>
          <span>{book.language || 'English'}</span>
          <span className="text-gray-300 text-[9px]">•</span>
          <span>{book.type || 'PDF Ebook'}</span>
        </div>

        {/* Publication below above row */}
        <p className="text-[11px] text-gray-400 truncate mt-0.5">
          {book.publisher || book.publication || 'Exam Kart'}
        </p>
      </div>

      {/* Right Pricing & Buy / Cart Actions */}
      <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
        <div>
          <p className="text-sm sm:text-base font-black text-[#4029AB] tracking-tight">
            ₹{book.buy_price}
          </p>
          {book.list_price && book.list_price > book.buy_price && (
            <p className="text-[10px] text-gray-400 line-through">
              ₹{book.list_price}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          {isPurchased ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectBook(book);
              }}
              className="px-2.5 sm:px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
              <span>Owned</span>
            </button>
          ) : (
            <>
              <button
                id={`list-add-cart-${book.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(book, e);
                }}
                className={`p-1.5 rounded-lg border transition-all active:scale-90 cursor-pointer ${
                  inCart
                    ? 'bg-[#4029AB] text-white border-[#4029AB]'
                    : 'border-gray-200 text-gray-700 bg-white hover:border-[#4029AB] hover:text-[#4029AB]'
                }`}
                title={inCart ? 'In Cart (Click to toggle)' : 'Add to Cart'}
              >
                {inCart ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
                )}
              </button>

              <button
                id={`list-buy-now-${book.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onBuyNow) {
                    onBuyNow(book);
                  } else {
                    onSelectBook(book);
                  }
                }}
                className="px-2.5 sm:px-3 py-1 bg-[#4029AB] text-white text-[9px] sm:text-[10px] rounded-lg font-bold uppercase tracking-wider hover:bg-[#32208a] active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                Buy Now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const BookListView: React.FC<BookListViewProps> = ({
  books,
  title = 'Best Sellers (List View)',
  onSelectBook,
  onAddToCart,
  onBuyNow,
  cartBookIds,
  purchasedBookIds = [],
  wishlistBookIds = new Set(),
  onToggleWishlist,
  onViewAll,
  viewAllHref,
  limit,
}) => {
  const displayBooks = limit && limit > 0 ? books.slice(0, limit) : books.slice(0, 12);
  if (!displayBooks || displayBooks.length === 0) return null;

  return (
    <section id="standard-list-view" className="w-full py-3 px-3 sm:px-6">
      {title && (
        <div className="flex justify-between items-end mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              {title}
            </h2>
            <span className="text-[11px] font-semibold text-gray-400">
              Showing {displayBooks.length} Books
            </span>
          </div>
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-xs sm:text-sm font-semibold text-[#4029AB] hover:text-[#34208e] flex items-center gap-0.5 transition-colors py-1 pl-2"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : onViewAll ? (
            <button
              onClick={onViewAll}
              className="text-xs sm:text-sm font-semibold text-[#4029AB] hover:text-[#34208e] flex items-center gap-0.5 cursor-pointer transition-colors py-1 pl-2"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      )}

      {/* Professional Polish Card List Items */}
      <div className="space-y-3">
        {displayBooks.map((book) => (
          <BookListItem
            key={book.id}
            book={book}
            onSelectBook={onSelectBook}
            onAddToCart={onAddToCart}
            onBuyNow={onBuyNow}
            inCart={cartBookIds.has(book.id)}
            isPurchased={purchasedBookIds.includes(book.id)}
            isWishlisted={wishlistBookIds.has(book.id)}
            onToggleWishlist={onToggleWishlist}
          />
        ))}
      </div>
    </section>
  );
};

