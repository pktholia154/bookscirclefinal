'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  BookOpen,
  ShoppingCart,
  Check,
  Layers,
} from 'lucide-react';
import { Book, Category } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';

interface CategoriesViewProps {
  categories: Category[];
  books: Book[];
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e?: React.MouseEvent) => void;
  cartBookIds: Set<string>;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  books,
  onSelectBook,
  onAddToCart,
  cartBookIds,
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');

  // Compute book count per category
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    books.forEach((b) => {
      const cat = b.category || 'General';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [books]);

  // Filtered books by category only (no search box)
  const filteredBooks = useMemo(() => {
    if (selectedCat === 'all') return books;
    return books.filter(
      (b) => b.category.toLowerCase() === selectedCat.toLowerCase()
    );
  }, [books, selectedCat]);

  return (
    <div className="w-full px-4 sm:px-6 py-4 sm:py-6 max-w-5xl mx-auto space-y-5 bg-white">
      {/* 1. Header with exact requested label */}
      <div className="border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
            Book Categories
          </h1>
          <span className="bg-[#4029AB]/10 text-[#4029AB] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {categories.length} Categories
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Explore study material by syllabus, exams, engineering streams, and specialized modules.
        </p>
      </div>

      {/* 2. Seamless Category Chips (No Box, No Background Container, Unboxed Flow) */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* All Categories Chip */}
          <button
            id="cat-chip-all"
            onClick={() => setSelectedCat('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              selectedCat === 'all'
                ? 'bg-[#4029AB] text-white shadow-2xs'
                : 'bg-transparent text-gray-700 hover:text-[#4029AB] hover:bg-gray-100/60 border border-gray-200/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Categories</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                selectedCat === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {books.length}
            </span>
          </button>

          {/* Individual Category Chips - Seamlessly placed without background boxes */}
          {categories.map((cat) => {
            const isSelected = selectedCat.toLowerCase() === cat.title.toLowerCase();
            const count = categoryCounts[cat.title] || 0;

            return (
              <button
                key={cat.id}
                id={`cat-chip-${cat.seolsug || cat.id}`}
                onClick={() => setSelectedCat(cat.title)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#4029AB] text-white shadow-2xs'
                    : 'bg-transparent text-gray-700 hover:text-[#4029AB] hover:bg-gray-100/60 border border-gray-200/80'
                }`}
              >
                <span>{cat.title}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Filtered Books Results */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h2 className="text-sm sm:text-base font-black text-gray-950">
            {selectedCat === 'all' ? 'All E-Books' : `${selectedCat} Titles`}
          </h2>
          <span className="text-xs font-bold text-gray-400">
            {filteredBooks.length} Books Found
          </span>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="py-12 text-center bg-gray-50/70 rounded-2xl border border-gray-200/80 space-y-2">
            <BookOpen className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-xs text-gray-600 font-bold">No books found in this category.</p>
            <button
              onClick={() => setSelectedCat('all')}
              className="text-xs font-bold text-[#4029AB] hover:underline cursor-pointer"
            >
              Show all books
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredBooks.map((book) => {
              const inCart = cartBookIds.has(book.id);

              return (
                <div
                  key={book.id}
                  id={`cat-book-${book.id}`}
                  onClick={() => onSelectBook(book)}
                  className="flex items-start gap-3 p-3 rounded-2xl border border-gray-200 bg-white hover:border-[#4029AB]/40 hover:shadow-xs cursor-pointer transition-all active:scale-[0.99] group"
                >
                  {/* Sharp 3:4 Cover (No price on cover) */}
                  <div className="relative w-14 sm:w-16 aspect-[3/4] rounded-none overflow-hidden shrink-0 self-start bg-gray-100 border border-gray-200 shadow-2xs">
                    <Image
                      src={book.cover || DEFAULT_BOOK_COVER}
                      alt={book.title}
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover rounded-none group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                    <div>
                      <h4
                        className="font-bold text-xs sm:text-sm text-gray-950 truncate leading-snug group-hover:text-[#4029AB] transition-colors"
                        title={book.title}
                      >
                        {book.title}
                      </h4>
                      {/* Category, Language & Type in same row (display only field values, not field labels) */}
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate mt-1">
                        <span className="font-medium text-gray-600">{book.category || 'General'}</span>
                        <span className="text-gray-300 text-[9px]">•</span>
                        <span>{book.language || 'English'}</span>
                        <span className="text-gray-300 text-[9px]">•</span>
                        <span>{book.type || 'PDF Ebook'}</span>
                      </div>
                      {/* Publication below above row */}
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {book.publisher || book.publication || 'Exam Kart'}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black text-gray-950">
                        ₹{book.buy_price}
                      </span>

                      <button
                        id={`cat-add-cart-${book.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(book, e);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                          inCart
                            ? 'bg-[#4029AB] text-white'
                            : 'bg-gray-100 hover:bg-[#4029AB] hover:text-white text-gray-800'
                        }`}
                      >
                        {inCart ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>In Cart</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
