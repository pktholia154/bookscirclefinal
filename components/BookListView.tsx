'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { Book } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';

interface BookListViewProps {
  books: Book[];
  title?: string;
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e: React.MouseEvent) => void;
  cartBookIds: Set<string>;
}

const BookListItem: React.FC<{
  book: Book;
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e: React.MouseEvent) => void;
  inCart: boolean;
}> = ({ book, onSelectBook, onAddToCart, inCart }) => {
  const [imgSrc, setImgSrc] = useState(book.cover || DEFAULT_BOOK_COVER);
  const tags = book.topics && book.topics.length > 0 
    ? book.topics.slice(0, 2) 
    : [book.category, 'PDF E-Book'];

  return (
    <div
      id={`list-item-${book.id}`}
      onClick={() => onSelectBook(book)}
      className="group flex items-start gap-3.5 sm:gap-4 bg-gray-50/80 hover:bg-gray-50 p-3 sm:p-3.5 rounded-2xl border border-gray-100 cursor-pointer transition-all active:scale-[0.99] shadow-2xs"
    >
      {/* Book Cover Thumbnail: Aligned to top, 2:3 ratio, sharp corners */}
      <div className="relative w-14 sm:w-16 aspect-[2/3] rounded-none overflow-hidden shrink-0 self-start bg-gray-200 shadow-2xs border border-gray-200">
        <Image
          src={imgSrc}
          alt={book.title}
          fill
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

        {/* Subtitle / Category */}
        <p className="text-[11px] text-gray-500 truncate mt-0.5 mb-1.5">
          {book.category} • {book.pages || 320} Pages
        </p>

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[9px] sm:text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Right Pricing & Buy / Cart Actions */}
      <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
        <p className="text-sm sm:text-base font-bold text-[#4029AB] tracking-tight">
          ₹{book.buy_price}
        </p>

        <div className="flex items-center gap-1.5 mt-2">
          <button
            id={`list-add-cart-${book.id}`}
            onClick={(e) => onAddToCart(book, e)}
            className={`p-1.5 rounded-lg border transition-all active:scale-90 ${
              inCart
                ? 'bg-[#4029AB] text-white border-[#4029AB]'
                : 'border-gray-200 text-gray-700 bg-white hover:border-[#4029AB] hover:text-[#4029AB]'
            }`}
            title={inCart ? 'In Cart' : 'Add to Cart'}
          >
            <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          <button
            id={`list-buy-now-${book.id}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!inCart) onAddToCart(book, e);
              onSelectBook(book);
            }}
            className="px-2.5 sm:px-3 py-1 bg-[#4029AB] text-white text-[9px] sm:text-[10px] rounded-lg font-bold uppercase tracking-wider hover:bg-[#32208a] active:scale-95 transition-all shadow-2xs"
          >
            Buy Now
          </button>
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
  cartBookIds,
}) => {
  if (!books || books.length === 0) return null;

  return (
    <section id="standard-list-view" className="w-full py-3 px-6">
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
            inCart={cartBookIds.has(book.id)}
          />
        ))}
      </div>
    </section>
  );
};

