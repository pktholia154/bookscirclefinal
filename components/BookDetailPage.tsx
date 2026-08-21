'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  BookmarkCheck,
  Star,
  BookOpen,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Send,
  Sparkles,
  Download,
  Eye,
  ShieldCheck,
  ShoppingBag,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Review } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import { PDFReaderModal } from '@/components/PDFReaderModal';

interface BookDetailPageProps {
  book: Book;
  onBack: () => void;
  onAddToCart: (book: Book) => void;
  onBuyNow: (book: Book) => void;
  isInCart: boolean;
  isPurchased?: boolean;
  relatedBooks?: Book[];
  onSelectRelatedBook?: (book: Book) => void;
}

export const BookDetailPage: React.FC<BookDetailPageProps> = ({
  book,
  onBack,
  onAddToCart,
  onBuyNow,
  isInCart,
  isPurchased = false,
  relatedBooks = [],
  onSelectRelatedBook,
}) => {
  const [imgLoadFailed, setImgLoadFailed] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [activePdfReaderMode, setActivePdfReaderMode] = useState<'sample' | 'full' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const imgSrc = imgLoadFailed ? DEFAULT_BOOK_COVER : (book.cover || DEFAULT_BOOK_COVER);

  // Reviews state with local interactive submission (no hardcoded demo reviews)
  const [customReviews, setCustomReviews] = useState<Review[]>([]);

  const reviewsList = useMemo(() => {
    return [...customReviews, ...(book.reviews && Array.isArray(book.reviews) ? book.reviews : [])];
  }, [customReviews, book.reviews]);

  // User review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewName, setNewReviewName] = useState('');

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [book.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: `Check out "${book.title}" on BooksCircle: ${book.seo_description}`,
          url: window.location.href,
        });
        showToast('Link shared successfully');
      } catch {
        // Share cancelled or unsupported
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!');
      } catch {
        showToast('Could not copy link');
      }
    }
  };

  const toggleWishlist = () => {
    setIsWishlisted((prev) => {
      const next = !prev;
      showToast(next ? 'Added to your wishlist!' : 'Removed from wishlist');
      return next;
    });
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim()) return;

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      user: newReviewName.trim() || 'BooksCircle Student',
      rating: newReviewRating,
      date: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      comment: newReviewComment.trim(),
    };

    setCustomReviews((prev) => [newRev, ...prev]);
    setNewReviewComment('');
    setNewReviewName('');
    setShowReviewForm(false);
    showToast('Thank you! Your review has been published.');
  };

  const rating = book.rating || 3.8;
  const ratingCount = book.rating_count || 1150;
  const formattedReviewsCount =
    ratingCount >= 1000
      ? `${(ratingCount / 1000).toFixed(2).replace(/\.00$/, '')}K`
      : ratingCount.toString();

  const authorName = book.author || 'Editorial Board';
  const publisherName = book.publisher || 'Jaico Publishing House';
  const pageCount = book.pages || 236;

  // Rating percentage bars (approx distribution)
  const ratingBars = [
    { stars: 5, pct: 68 },
    { stars: 4, pct: 20 },
    { stars: 3, pct: 8 },
    { stars: 2, pct: 3 },
    { stars: 1, pct: 5 },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-28 sm:pb-20 antialiased selection:bg-[#4029AB] selection:text-white">
      {/* 1. Dedicated Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="book-detail-back-btn"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer shrink-0"
            aria-label="Go back to catalog"
          >
            <ArrowLeft className="w-4 h-4 text-gray-800" />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 truncate">
            {book.category} Ebook
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer"
            title="Share this book"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={toggleWishlist}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isWishlisted
                ? 'bg-[#4029AB]/10 text-[#4029AB]'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Wishlist"
            aria-label="Wishlist"
          >
            {isWishlisted ? (
              <BookmarkCheck className="w-4 h-4 text-[#4029AB] fill-[#4029AB]" />
            ) : (
              <Bookmark className="w-4 h-4 text-gray-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* 2. Top Book Identity Section (Cover on Left, Title/Author/Publisher on Right) */}
        <section className="flex gap-4 sm:gap-6 items-start">
          {/* Book Cover (Ratio 2:3, Sharp corners, no rounded edges) */}
          <div className="relative w-24 sm:w-32 aspect-[2/3] shrink-0 rounded-none overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
            <Image
              src={imgSrc}
              alt={book.title}
              fill
              sizes="(max-width: 640px) 96px, 128px"
              className="object-cover rounded-none"
              priority
              referrerPolicy="no-referrer"
              onError={() => setImgLoadFailed(true)}
            />
          </div>

          {/* Title, Author & Publisher */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-950 leading-snug tracking-tight">
              {book.title}
            </h1>
            <p className="text-sm text-gray-800 font-medium mt-1.5">
              {authorName}
            </p>
            <p className="text-xs text-gray-500 font-normal mt-0.5">
              {publisherName}
            </p>
          </div>
        </section>

        {/* 3. Four-Column Key Metrics Bar (Divided by subtle vertical rules) */}
        <section className="border-y border-gray-100 py-3">
          <div className="grid grid-cols-4 items-center text-center">
            {/* Stat 1: Rating */}
            <div className="flex flex-col items-center justify-center px-1">
              <div className="flex items-center gap-0.5 text-xs font-bold text-gray-900">
                <span>{rating.toFixed(1)}</span>
                <Star className="w-3.5 h-3.5 fill-gray-900 text-gray-900" />
              </div>
              <span className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
                {formattedReviewsCount} reviews
              </span>
            </div>

            {/* Stat 2: Ebook Format */}
            <div className="flex flex-col items-center justify-center px-1 border-l border-gray-200">
              <BookOpen className="w-4 h-4 text-gray-700" />
              <span className="text-[11px] text-gray-500 mt-0.5">
                Ebook
              </span>
            </div>

            {/* Stat 3: Pages Count */}
            <div className="flex flex-col items-center justify-center px-1 border-l border-gray-200">
              <span className="text-xs font-bold text-gray-900">
                {pageCount}
              </span>
              <span className="text-[11px] text-gray-500 mt-0.5">
                Pages
              </span>
            </div>

            {/* Stat 4: Add to Wishlist */}
            <div
              onClick={toggleWishlist}
              className="flex flex-col items-center justify-center px-1 border-l border-gray-200 cursor-pointer active:scale-95 transition-transform"
            >
              <Bookmark
                className={`w-4 h-4 transition-colors ${
                  isWishlisted ? 'text-[#4029AB] fill-[#4029AB]' : 'text-[#4029AB]'
                }`}
              />
              <span className="text-[11px] font-semibold text-[#4029AB] mt-0.5 whitespace-nowrap">
                {isWishlisted ? 'Wishlisted' : 'Add to wishlist'}
              </span>
            </div>
          </div>
        </section>

        {/* 4. Action Buttons (Free Sample & Buy/Add to Cart/Read PDF) */}
        <section className="grid grid-cols-2 gap-3 pt-1">
          <button
            id="book-detail-free-sample-btn"
            onClick={() => setActivePdfReaderMode('sample')}
            className="w-full py-2.5 px-4 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-xs sm:text-sm font-bold text-[#4029AB] bg-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Eye className="w-4 h-4 text-[#4029AB]" />
            <span>Free Sample</span>
          </button>

          {isPurchased ? (
            <button
              id="book-detail-read-btn"
              onClick={() => setActivePdfReaderMode('full')}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-white" />
              <span>Read Full PDF</span>
            </button>
          ) : (
            <button
              id="book-detail-buy-btn"
              onClick={() => onAddToCart(book)}
              className="w-full py-2.5 px-4 rounded-lg bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>
                {isInCart ? 'In Cart (₹' + book.buy_price + ')' : '₹' + book.buy_price + ' Ebook'}
              </span>
            </button>
          )}
        </section>

        {/* 5. "About this eBook" Section */}
        <section className="space-y-2 pt-2">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            About this eBook
          </h2>

          <div className="text-xs sm:text-sm text-gray-600 leading-relaxed space-y-2">
            <p className={isAboutExpanded ? '' : 'line-clamp-3'}>
              {book.full_description || book.seo_description}
            </p>

            {/* Expandable detailed metadata & table */}
            {isAboutExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 space-y-3"
              >
                {book.topics && book.topics.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 mb-1.5">
                      Key Topics Covered
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {book.topics.map((topic, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded bg-gray-100 text-[11px] font-medium text-gray-700"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical / Publishing Specs Table */}
                <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3.5 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 border-b border-gray-200/60 pb-2">
                    <span className="text-gray-500">Publisher</span>
                    <span className="font-semibold text-gray-900">{publisherName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-gray-200/60 pb-2">
                    <span className="text-gray-500">Published on</span>
                    <span className="font-semibold text-gray-900">{book.published_date || '2023'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-gray-200/60 pb-2">
                    <span className="text-gray-500">Language</span>
                    <span className="font-semibold text-gray-900">{book.language || 'English'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-gray-200/60 pb-2">
                    <span className="text-gray-500">ISBN / Identifier</span>
                    <span className="font-semibold text-gray-900">{book.isbn || '978-81-94821-44-1'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-500">File Format & Size</span>
                    <span className="font-semibold text-gray-900">PDF ({book.file_size || '14.2 MB'})</span>
                  </div>
                </div>
              </motion.div>
            )}

            <button
              onClick={() => setIsAboutExpanded(!isAboutExpanded)}
              className="text-xs font-bold text-[#4029AB] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
            >
              <span>{isAboutExpanded ? 'Show less' : 'See more about this book'}</span>
              {isAboutExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </section>

        {/* 6. "Ratings and reviews" Section */}
        <section className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-1.5">
              <span>Ratings and reviews</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </h2>

            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-xs font-bold text-[#4029AB] hover:underline cursor-pointer"
            >
              {showReviewForm ? 'Cancel' : 'Rate this book'}
            </button>
          </div>

          {/* Rating Summary Block (Left: Big Number & Stars, Right: 5 Distribution Bars) */}
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Left: Overall Rating */}
            <div className="flex flex-col items-start shrink-0">
              <span className="text-4xl sm:text-5xl font-black text-gray-950 tracking-tight leading-none">
                {rating.toFixed(1)}
              </span>
              <div className="flex items-center gap-0.5 mt-2 text-[#4029AB]">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(rating)
                        ? 'fill-[#4029AB] text-[#4029AB]'
                        : 'text-gray-200 fill-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 mt-1 font-medium">
                {formattedReviewsCount} reviews
              </span>
            </div>

            {/* Right: 5-to-1 Star Horizontal Progress Bars */}
            <div className="flex-1 space-y-1.5">
              {ratingBars.map((bar) => (
                <div key={bar.stars} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 text-right font-medium text-gray-600 text-[11px]">
                    {bar.stars}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4029AB] rounded-full transition-all duration-500"
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Review Form */}
          <AnimatePresence>
            {showReviewForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddReview}
                className="p-4 rounded-xl border border-[#4029AB]/20 bg-[#4029AB]/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Your Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setNewReviewRating(s)}
                        className="p-0.5 cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            s <= newReviewRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={newReviewName}
                  onChange={(e) => setNewReviewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4029AB]"
                />

                <textarea
                  placeholder="Write your review and study feedback..."
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#4029AB] resize-none"
                />

                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-[#4029AB] text-white text-xs font-bold hover:bg-[#34208e] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Review</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* User Reviews List */}
          <div className="space-y-4 pt-2">
            {reviewsList.length === 0 ? (
              <div className="py-6 text-center bg-gray-50/70 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">No reviews yet for this title.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Click &ldquo;Rate this book&rdquo; above to be the first to share your feedback!</p>
              </div>
            ) : (
              reviewsList.map((rev) => (
                <div key={rev.id} className="space-y-1.5 border-b border-gray-100 pb-3.5 last:border-0">
                  {/* User Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* User Avatar */}
                      {rev.avatar ? (
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
                          <Image
                            src={rev.avatar}
                            alt={rev.user}
                            fill
                            sizes="32px"
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center font-bold text-xs shrink-0">
                          {rev.user.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-bold text-gray-900">{rev.user}</span>
                    </div>

                    <button
                      className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      aria-label="Review options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Rating Stars + Date */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-0.5 text-[#4029AB]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= rev.rating
                              ? 'fill-[#4029AB] text-[#4029AB]'
                              : 'text-gray-200 fill-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-400 font-normal">
                      {rev.date}
                    </span>
                  </div>

                  {/* Comment Text */}
                  <p className="text-xs text-gray-700 leading-relaxed font-normal pt-0.5">
                    {rev.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 7. Similar Books Section (Carousel) */}
        {relatedBooks.length > 0 && (
          <section className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">
              More in {book.category}
            </h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {relatedBooks.map((relBook) => (
                <div
                  key={relBook.id}
                  onClick={() => onSelectRelatedBook && onSelectRelatedBook(relBook)}
                  className="w-24 shrink-0 cursor-pointer group"
                >
                  <div className="relative aspect-[2/3] w-full rounded-none overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs">
                    <Image
                      src={relBook.cover || DEFAULT_BOOK_COVER}
                      alt={relBook.title}
                      fill
                      sizes="96px"
                      className="object-cover rounded-none group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h4 className="text-[11px] font-bold text-gray-900 truncate mt-1.5 group-hover:text-[#4029AB]">
                    {relBook.title}
                  </h4>
                  <span className="text-[10px] text-gray-500 font-semibold">
                    ₹{relBook.buy_price}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Floating Bottom Sticky Bar for Quick Purchase on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-500 font-medium">Digital Edition</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-gray-950">₹{book.buy_price}</span>
              {book.list_price > book.buy_price && (
                <span className="text-xs text-gray-400 line-through">₹{book.list_price}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePdfReaderMode('sample')}
              className="px-3.5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-bold text-[#4029AB] transition-all cursor-pointer flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Sample</span>
            </button>
            {isPurchased ? (
              <button
                onClick={() => setActivePdfReaderMode('full')}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read Full PDF</span>
              </button>
            ) : (
              <button
                onClick={() => onBuyNow(book)}
                className="px-5 py-2 rounded-lg bg-[#4029AB] hover:bg-[#34208e] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                Buy Ebook
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time PDFium WASM Vector PDF Reader for Sample & Purchased Reading */}
      {activePdfReaderMode && (
        <PDFReaderModal
          book={book}
          mode={activePdfReaderMode}
          onClose={() => setActivePdfReaderMode(null)}
          onBuyNow={(b) => {
            setActivePdfReaderMode(null);
            onBuyNow(b);
          }}
          isPurchased={isPurchased}
        />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 pointer-events-none"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
