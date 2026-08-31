'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  Search,
  X,
  ArrowLeft,
  ShoppingBag,
  ShoppingCart,
  Star,
  Clock,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  Check,
  BookOpen,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Category } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';

interface DedicatedSearchViewProps {
  books: Book[];
  categories: Category[];
  initialQuery?: string;
  onBack: () => void;
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e?: React.MouseEvent) => void;
  onBuyNow: (book: Book) => void;
  cartBookIds: Set<string>;
  purchasedBookIds?: string[];
}

const POPULAR_SEARCH_TAGS = [
  'CUET PG',
  'Agribusiness',
  'Agama',
  'History',
  'Mock Tests',
  'Question Bank',
  'Sanskrit',
  'Agricultural Science',
  'Economics',
  'General Studies',
];

const ANIMATED_PLACEHOLDERS = [
  'Search 500+ UPSC, SSC & Banking PDFs...',
  'Search "Atomic Habits", "General Studies"...',
  'Search Quantitative Aptitude, Reasoning & CSAT...',
  'Search Civil, Mechanical & Electrical Engineering...',
  'Search UPSC Mains & Prelims Handbooks...',
  'Search NCERT & State Govt Exam Guides...',
  'Search by exam, author, topic or keyword...',
];

export const DedicatedSearchView: React.FC<DedicatedSearchViewProps> = ({
  books,
  categories,
  initialQuery = '',
  onBack,
  onSelectBook,
  onAddToCart,
  onBuyNow,
  cartBookIds,
  purchasedBookIds = [],
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'price_low' | 'price_high'>('relevance');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input and load recent searches on mount
  useEffect(() => {
    inputRef.current?.focus();
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('bookscircle_recent_searches');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed.slice(0, 8));
          }
        }
      } catch {}
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Save query to recent searches
  const saveRecentSearch = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem('bookscircle_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('bookscircle_recent_searches');
    } catch {}
  };

  // Cycling animated placeholder
  useEffect(() => {
    if (query) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ANIMATED_PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [query]);

  // Real-time filtering and sorting
  const searchResults = useMemo(() => {
    let list = books;
    const q = query.trim().toLowerCase();

    // 1. Filter by category
    if (selectedCategory !== 'all') {
      const target = selectedCategory.toLowerCase().trim();
      list = list.filter((b) => {
        const cat = (b.category || '').toLowerCase();
        const slug = (b.categorySlug || '').toLowerCase();
        return cat === target || slug === target || target.includes(slug) || slug.includes(target) || target.includes(cat) || cat.includes(target);
      });
    }

    // 2. Filter by search query
    if (q) {
      list = list.filter((b) => {
        const titleMatch = b.title?.toLowerCase().includes(q);
        const catMatch = b.category?.toLowerCase().includes(q);
        const authorMatch = b.author?.toLowerCase().includes(q);
        const publisherMatch = b.publisher?.toLowerCase().includes(q);
        const descMatch = b.seo_description?.toLowerCase().includes(q) || b.full_description?.toLowerCase().includes(q);
        const topicMatch = b.topics && b.topics.some((t) => t.toLowerCase().includes(q));
        const tagMatch = b.tags && b.tags.some((t) => t.toLowerCase().includes(q));

        return titleMatch || catMatch || authorMatch || publisherMatch || descMatch || topicMatch || tagMatch;
      });
    }

    // 3. Sort results
    if (sortBy === 'rating') {
      list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price_low') {
      list = [...list].sort((a, b) => (a.buy_price || 0) - (b.buy_price || 0));
    } else if (sortBy === 'price_high') {
      list = [...list].sort((a, b) => (b.buy_price || 0) - (a.buy_price || 0));
    }

    return list;
  }, [books, query, selectedCategory, sortBy]);

  const handleExecuteSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    saveRecentSearch(searchTerm);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 selection:bg-[#4029AB] selection:text-white">
      {/* 1. Dedicated Sticky Top Search Bar Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-3 sm:px-5 py-2.5 transition-all">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Back Button */}
          <button
            id="search-page-back-btn"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer shrink-0"
            aria-label="Back to previous page"
          >
            <ArrowLeft className="w-4 h-4 text-gray-800" />
          </button>

          {/* Stylish Search Bar Container with Glowing Focus & Animated Label */}
          <div className="relative flex-1 group">
            <div className="relative flex items-center w-full bg-gray-50 border-2 border-gray-200 group-focus-within:border-[#4029AB] group-focus-within:bg-white group-focus-within:shadow-md transition-all rounded-full overflow-hidden">
              <Search className="w-4 h-4 text-[#4029AB] ml-3.5 shrink-0" />

              <input
                ref={inputRef}
                id="dedicated-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveRecentSearch(query);
                  }
                }}
                className="w-full pl-2.5 pr-9 py-2 text-xs sm:text-sm bg-transparent text-gray-950 font-medium focus:outline-none placeholder-transparent"
                placeholder="Search..."
              />

              {/* Animated Floating Label inside Search Bar when query is empty */}
              {!query && (
                <div
                  onClick={() => inputRef.current?.focus()}
                  className="absolute left-9 right-8 pointer-events-none flex items-center overflow-hidden h-6"
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIndex}
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="text-xs sm:text-sm text-gray-400 font-normal truncate block"
                    >
                      {ANIMATED_PLACEHOLDERS[placeholderIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}

              {/* Clear Input Action */}
              {query && (
                <button
                  id="search-clear-btn"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Search View Content */}
      <main className="px-3 sm:px-5 py-3 space-y-4">


        {/* Search Results Header: Count & Sort Filter */}
        <div className="flex items-center justify-between pt-1 border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black text-gray-950">
              {query ? `Search: "${query}"` : selectedCategory !== 'all' ? selectedCategory : 'All E-Books'}
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#4029AB]/10 text-[#4029AB]">
              {searchResults.length} Books
            </span>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-bold text-gray-800 bg-transparent border-0 focus:outline-none cursor-pointer pr-1"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="rating">Top Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Search Results List (Standard High Density List View) */}
        {searchResults.length === 0 ? (
          <div className="py-16 text-center bg-gray-50/70 rounded-3xl border border-gray-200/80 space-y-3 px-4">
            <BookOpen className="w-10 h-10 text-gray-400 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">No matching e-books found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Try searching with general keywords like &ldquo;UPSC&rdquo;, &ldquo;Maths&rdquo;, &ldquo;Reasoning&rdquo;, or &ldquo;Engineering&rdquo;.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
              {POPULAR_SEARCH_TAGS.slice(0, 4).map((tag, i) => (
                <button
                  key={i}
                  onClick={() => handleExecuteSearch(tag)}
                  className="px-3 py-1 rounded-full bg-white border border-gray-300 text-xs font-bold text-[#4029AB] hover:bg-gray-50 cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {searchResults.map((book) => {
              const inCart = cartBookIds.has(book.id);
              const isOwned = purchasedBookIds.includes(book.id);
              const discountPercent =
                book.list_price && book.list_price > book.buy_price
                  ? Math.round(((book.list_price - book.buy_price) / book.list_price) * 100)
                  : 0;

              return (
                <div
                  key={book.id}
                  id={`search-item-${book.id}`}
                  onClick={() => onSelectBook(book)}
                  className="group flex items-start gap-3 p-3 rounded-2xl border border-gray-200 bg-white hover:border-[#4029AB]/40 hover:shadow-xs transition-all cursor-pointer active:scale-[0.99]"
                >
                  {/* Book Cover (Ratio 3:4, Sharp corners) */}
                  <div className="relative w-14 sm:w-16 aspect-[3/4] rounded-none overflow-hidden shrink-0 self-start bg-gray-100 border border-gray-200 shadow-2xs">
                    <Image
                      src={book.cover || DEFAULT_BOOK_COVER}
                      alt={book.title}
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover rounded-none group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Middle Book Details */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h3 className="font-bold text-xs sm:text-sm text-gray-950 line-clamp-2 leading-snug group-hover:text-[#4029AB] transition-colors">
                      {book.title}
                    </h3>

                    {/* Category, Language & Type in same row (display only field values, not field labels) */}
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate mt-1">
                      <span className="font-medium text-gray-600">{book.category || 'General'}</span>
                      <span className="text-gray-300 text-[9px]">•</span>
                      <span>{book.language || 'English'}</span>
                      <span className="text-gray-300 text-[9px]">•</span>
                      <span>{book.type || 'PDF Ebook'}</span>
                    </div>

                    {/* Publication below above row */}
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {book.publisher || book.publication || 'Mocktime Publication'}
                    </p>

                    <div className="flex items-center gap-1 text-amber-500 mt-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-bold text-gray-700">
                        {book.rating?.toFixed(1) || '4.7'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ({book.rating_count || 120} reviews)
                      </span>
                    </div>
                  </div>

                  {/* Right Pricing & Quick Buy / Cart Actions */}
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
                      {isOwned ? (
                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Owned</span>
                        </span>
                      ) : (
                        <>
                          <button
                            id={`search-add-cart-${book.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(book, e);
                            }}
                            className={`p-1.5 rounded-lg border transition-all active:scale-90 cursor-pointer ${
                              inCart
                                ? 'bg-[#4029AB] text-white border-[#4029AB]'
                                : 'border-gray-200 text-gray-700 bg-white hover:border-[#4029AB] hover:text-[#4029AB]'
                            }`}
                            title={inCart ? 'In Cart' : 'Add to Cart'}
                          >
                            <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
                          </button>

                          <button
                            id={`search-buy-now-${book.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onBuyNow(book);
                            }}
                            className="px-2.5 sm:px-3 py-1 bg-[#4029AB] hover:bg-[#34208e] text-white text-[10px] rounded-lg font-bold uppercase tracking-wider active:scale-95 transition-all shadow-2xs cursor-pointer"
                          >
                            Buy
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
