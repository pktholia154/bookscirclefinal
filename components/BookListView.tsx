'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Check, BookOpen } from 'lucide-react';
import { Book } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import { loadRazorpayScript } from '@/lib/services/razorpay';

interface BookListViewProps {
  books: Book[];
  title?: string;
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e: React.MouseEvent) => void;
  onBuyNow?: (book: Book) => void;
  cartBookIds: Set<string>;
  purchasedBookIds?: string[];
}

const BookListItem: React.FC<{
  book: Book;
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e: React.MouseEvent) => void;
  onBuyNow?: (book: Book) => void;
  inCart: boolean;
  isPurchased: boolean;
}> = ({ book, onSelectBook, onAddToCart, onBuyNow, inCart, isPurchased }) => {
  const [imgSrc, setImgSrc] = useState(book.cover || DEFAULT_BOOK_COVER);

  const handlePreload = () => {
    loadRazorpayScript().catch(() => {});
  };

  return (
    <div
      id={`list-item-${book.id}`}
      onClick={() => onSelectBook(book)}
      onMouseEnter={handlePreload}
      onTouchStart={handlePreload}
      className="group flex items-start gap-3.5 sm:gap-4 bg-transparent p-2 sm:p-3.5 rounded-2xl border border-gray-100 hover:border-[#4029AB]/30 hover:bg-gray-50/50 cursor-pointer transition-all active:scale-[0.99]"
    >
      {/* Book Cover Thumbnail: Aligned to top, 3:4 ratio, sharp corners */}
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
}) => {
  if (!books || books.length === 0) return null;

  return (
    <section id="standard-list-view" className="w-full py-3 px-3 sm:px-6">
      {title && (
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-lg font-bold text-gray-800 tracking-tight">
            {title}
          </h2>
          <span className="text-xs font-bold text-gray-400">
            {books.length} Books
          </span>
        </div>
      )}

      {/* Professional Polish Card List Items */}
      <div className="space-y-3">
        {books.map((book) => (
          <BookListItem
            key={book.id}
            book={book}
            onSelectBook={onSelectBook}
            onAddToCart={onAddToCart}
            onBuyNow={onBuyNow}
            inCart={cartBookIds.has(book.id)}
            isPurchased={purchasedBookIds.includes(book.id)}
          />
        ))}
      </div>
    </section>
  );
};

