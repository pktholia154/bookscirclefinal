'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  LayoutGrid,
  BookOpen,
  Search,
  ShoppingCart,
  Check,
  ChevronRight,
  Layers,
  Sparkles
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
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Compute book count per category
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    books.forEach((b) => {
      const cat = b.category || 'General';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [books]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    let result = books;

    if (selectedCat !== 'all') {
      result = result.filter(
        (b) => b.category.toLowerCase() === selectedCat.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          (b.topics && b.topics.some((t) => t.toLowerCase().includes(q))) ||
          b.author?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [books, selectedCat, searchQuery]);

  return (
    <div className="w-full px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-6">
      {/* 1. Header */}
      <div className="border-b border-gray-100 pb-4">
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

      {/* 2. Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search subjects, exams, or syllabus topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#4029AB] focus:bg-white"
        />
      </div>

      {/* 3. All Categories in Chips Style */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Select Category (Chips)
          </span>
          <span className="text-[11px] text-gray-500 font-medium">
            {selectedCat === 'all' ? 'Showing All' : selectedCat}
          </span>
        </div>

        {/* Chips Container */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50/70 border border-gray-200/80 rounded-2xl">
          {/* All Chip */}
          <button
            id="cat-chip-all"
            onClick={() => setSelectedCat('all')}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              selectedCat === 'all'
                ? 'bg-[#4029AB] text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Categories</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                selectedCat === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {books.length}
            </span>
          </button>

          {/* Individual Category Chips */}
          {categories.map((cat) => {
            const isSelected = selectedCat.toLowerCase() === cat.title.toLowerCase();
            const count = categoryCounts[cat.title] || 0;

            return (
              <button
                key={cat.id}
                id={`cat-chip-${cat.seolsug || cat.id}`}
                onClick={() => setSelectedCat(cat.title)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#4029AB] text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                <span>{cat.title}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
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

      {/* 4. Filtered Books Results */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {selectedCat === 'all' ? 'All E-Books' : `${selectedCat} Titles`}
          </h2>
          <span className="text-xs font-bold text-gray-400">
            {filteredBooks.length} Books Found
          </span>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
            <BookOpen className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-xs text-gray-600 font-bold">No books found in this category.</p>
            <button
              onClick={() => {
                setSelectedCat('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-[#4029AB] hover:underline cursor-pointer"
            >
              Show all books
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredBooks.map((book) => {
              const inCart = cartBookIds.has(book.id);

              return (
                <div
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-gray-200 bg-white hover:border-[#4029AB]/40 hover:shadow-md cursor-pointer transition-all active:scale-[0.99] group"
                >
                  {/* Sharp 2:3 Cover */}
                  <div className="relative w-14 sm:w-16 aspect-[2/3] rounded-none overflow-hidden shrink-0 self-start bg-gray-100 border border-gray-200 shadow-2xs">
                    <Image
                      src={book.cover || DEFAULT_BOOK_COVER}
                      alt={book.title}
                      fill
                      sizes="64px"
                      className="object-cover rounded-none group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                    <div>
                      <span className="text-[9px] font-bold text-[#4029AB] bg-[#4029AB]/10 px-1.5 py-0.2 rounded uppercase">
                        {book.category}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-950 line-clamp-2 mt-1 leading-snug group-hover:text-[#4029AB] transition-colors">
                        {book.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {book.author || 'BooksCircle'} • {book.pages || 220} Pages
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-sm font-black text-gray-950">
                        ₹{book.buy_price}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(book, e);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 ${
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
