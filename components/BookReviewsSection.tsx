'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Image from 'next/image';
import {
  Star,
  ThumbsUp,
  CheckCircle2,
  Send,
  MessageSquarePlus,
  Filter,
  ArrowUpDown,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Review, Book } from '@/lib/types';
import {
  subscribeToBookReviews,
  addReviewToBook,
  voteReviewHelpful,
  computeRatingStats,
  hasUserVotedHelpful,
  getCachedReviewsSync,
} from '@/lib/services/reviews';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getPurchasedBookIdsFromLocal } from '@/lib/offline-storage';

interface BookReviewsSectionProps {
  book: Book;
  onRatingUpdated?: (newRating: number, newCount: number) => void;
  className?: string;
}

export const BookReviewsSection: React.FC<BookReviewsSectionProps> = ({
  book,
  onRatingUpdated,
  className = '',
}) => {
  const [reviews, setReviews] = useState<Review[]>(() => {
    // Combine local initial cache with any reviews baked in the book item
    const cached = getCachedReviewsSync(book.id);
    if (cached.length > 0) return cached;
    return Array.isArray(book.reviews) ? book.reviews : [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPurchasedUser, setIsPurchasedUser] = useState<boolean>(false);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewName, setReviewName] = useState<string>('');
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter & Sort state
  const [starFilter, setStarFilter] = useState<number | null>(null); // null means All
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'helpful'>('recent');

  // Track voted reviews in local component state for instant UI update
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  // Listen to Auth State
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && !reviewName) {
        setReviewName(user.displayName || user.email?.split('@')[0] || '');
      }
    });

    try {
      const ownedIds = getPurchasedBookIdsFromLocal();
      setIsPurchasedUser(ownedIds.includes(book.id));
    } catch {}

    return () => unsubAuth();
  }, [book.id, reviewName]);

  // Subscribe to real-time reviews from Firebase Firestore
  useEffect(() => {
    if (!book.id) return;

    const unsubscribe = subscribeToBookReviews(book.id, (liveReviews) => {
      if (Array.isArray(liveReviews) && liveReviews.length > 0) {
        setReviews(liveReviews);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [book.id]);

  // Helper Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Base book metadata rating fallback
  const baseRating = book.rating && book.rating > 0 ? book.rating : 4.8;
  const baseCount = book.rating_count && book.rating_count > 0 ? book.rating_count : 120;

  // Calculate dynamic stats
  const ratingStats = useMemo(() => {
    return computeRatingStats(reviews, baseRating, baseCount);
  }, [reviews, baseRating, baseCount]);

  // Notify parent if rating changes
  useEffect(() => {
    if (onRatingUpdated && reviews.length > 0) {
      onRatingUpdated(ratingStats.averageRating, ratingStats.totalCount);
    }
  }, [reviews.length, ratingStats.averageRating, ratingStats.totalCount, onRatingUpdated]);

  // Filtered and Sorted Reviews
  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (starFilter !== null) {
      list = list.filter((r) => Math.round(r.rating) === starFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'helpful') {
        return (b.helpfulCount || 0) - (a.helpfulCount || 0);
      }
      // 'recent'
      const timeA = new Date(a.createdAt || a.date || 0).getTime();
      const timeB = new Date(b.createdAt || b.date || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [reviews, starFilter, sortBy]);

  // Handle Review Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      showToast('Please provide your review thoughts.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalName = reviewName.trim() || currentUser?.displayName || 'BooksCircle Candidate';
      const finalAvatar = currentUser?.photoURL || undefined;

      const created = await addReviewToBook({
        bookId: book.id,
        rating: selectedRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
        userName: finalName,
        userAvatar: finalAvatar,
        userId: currentUser?.uid || undefined,
        verifiedPurchase: isPurchasedUser,
      });

      setReviews((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      setReviewComment('');
      setReviewTitle('');
      setIsFormOpen(false);
      showToast('Thank you! Your verified rating & review is live on BooksCircle.');
    } catch (err: any) {
      showToast('Could not save review. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Helpful Vote
  const handleVoteHelpful = async (rev: Review) => {
    if (votedIds.has(rev.id) || hasUserVotedHelpful(rev.id)) {
      showToast('You already found this review helpful.');
      return;
    }

    setVotedIds((prev) => new Set(prev).add(rev.id));
    const newCount = await voteReviewHelpful(book.id, rev);
    setReviews((prev) =>
      prev.map((r) => (r.id === rev.id ? { ...r, helpfulCount: newCount } : r))
    );
    showToast('Thank you for your feedback!');
  };

  const ratingSentimentText = useMemo(() => {
    const r = hoverRating ?? selectedRating;
    switch (r) {
      case 5:
        return '5 Stars — Excellent, highly recommended for preparation';
      case 4:
        return '4 Stars — Very good study material';
      case 3:
        return '3 Stars — Average, covered basic syllabus';
      case 2:
        return '2 Stars — Needs improvement or updates';
      case 1:
        return '1 Star — Not satisfied';
      default:
        return '';
    }
  }, [hoverRating, selectedRating]);

  return (
    <section
      id="book-ratings-reviews-section"
      className={`space-y-4 pt-4 border-t border-gray-100 ${className}`}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-1.5">
            <span>Ratings and reviews</span>
          </h2>
          <p className="text-[11px] text-gray-500 font-medium">
            Verified candidate feedback &amp; preparation ratings
          </p>
        </div>

        <button
          id="rate-this-book-btn"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#4029AB] bg-[#4029AB]/10 hover:bg-[#4029AB]/15 active:scale-95 transition-all cursor-pointer"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>{isFormOpen ? 'Cancel' : 'Rate this book'}</span>
        </button>
      </div>

      {/* Rating Summary Block */}
      <div className="flex items-center gap-6 sm:gap-8 p-3.5 sm:p-4 rounded-xl bg-gray-50/70 border border-gray-100">
        {/* Left: Overall Rating */}
        <div className="flex flex-col items-start shrink-0">
          <span className="text-4xl sm:text-5xl font-black text-gray-950 tracking-tight leading-none">
            {ratingStats.averageRating.toFixed(1)}
          </span>
          <div className="flex items-center gap-0.5 mt-2 text-[#4029AB]">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= Math.round(ratingStats.averageRating)
                    ? 'fill-[#4029AB] text-[#4029AB]'
                    : 'text-gray-200 fill-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 font-medium">
            {ratingStats.formattedCount} ratings
          </span>
        </div>

        {/* Right: 5-to-1 Star Horizontal Progress Bars */}
        <div className="flex-1 space-y-1.5">
          {ratingStats.distribution.map((bar) => {
            const isFilterActive = starFilter === bar.stars;
            return (
              <button
                key={bar.stars}
                onClick={() => setStarFilter(starFilter === bar.stars ? null : bar.stars)}
                className={`w-full flex items-center gap-2 text-xs group cursor-pointer transition-opacity ${
                  starFilter !== null && !isFilterActive ? 'opacity-40' : 'opacity-100'
                }`}
                title={`Filter ${bar.stars} star reviews`}
              >
                <span className="w-2.5 text-right font-bold text-gray-700 text-[11px]">
                  {bar.stars}
                </span>
                <div className="flex-1 h-2 bg-gray-200/70 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4029AB] rounded-full transition-all duration-500"
                    style={{ width: `${bar.percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[10px] text-gray-500 font-medium">
                  {bar.percentage}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Review Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmitReview}
            className="p-4 rounded-xl border border-[#4029AB]/20 bg-[#4029AB]/5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4029AB]" />
                  <span>Your Rating &amp; Review</span>
                </h3>
                <span className="text-[11px] text-gray-500 font-medium">
                  Help fellow exam aspirants make an informed decision
                </span>
              </div>

              {isPurchasedUser && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified Buyer</span>
                </span>
              )}
            </div>

            {/* Star Rating Selector */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => {
                  const isFilled = (hoverRating ?? selectedRating) >= s;
                  return (
                    <button
                      type="button"
                      key={s}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setSelectedRating(s)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                      aria-label={`Select ${s} stars`}
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300 stroke-gray-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] font-semibold text-[#4029AB]">
                {ratingSentimentText}
              </p>
            </div>

            {/* User Name Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Your Name (e.g., Rohit Kumar)"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#4029AB]"
              />

              <input
                type="text"
                placeholder="Review Headline (Optional, e.g. Best for CUET)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#4029AB]"
              />
            </div>

            {/* Review Comment Textarea */}
            <div>
              <textarea
                placeholder="Share your exam preparation experience, syllabus coverage, or quality of explanations..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                required
                maxLength={1000}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#4029AB] resize-none"
              />
              <div className="flex justify-between items-center text-[10px] text-gray-400 px-1">
                <span>Directly published to BooksCircle community</span>
                <span>{reviewComment.length}/1000</span>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-200/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reviewComment.trim()}
                className="px-5 py-2 rounded-lg bg-[#4029AB] text-white text-xs font-bold hover:bg-[#34208e] disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Posting...' : 'Submit Review'}</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filter Chips & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Star Rating Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStarFilter(null)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
              starFilter === null
                ? 'bg-[#4029AB] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200/80'
            }`}
          >
            All ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((s) => {
            const countForStar = reviews.filter((r) => Math.round(r.rating) === s).length;
            if (countForStar === 0 && reviews.length > 0) return null;
            const active = starFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStarFilter(active ? null : s)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#4029AB] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200/80'
                }`}
              >
                <span>{s}</span>
                <Star className={`w-3 h-3 ${active ? 'fill-white' : 'fill-amber-400 text-amber-400'}`} />
                {reviews.length > 0 && <span className="opacity-80">({countForStar})</span>}
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ArrowUpDown className="w-3 h-3 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-[11px] font-bold text-gray-800 bg-transparent focus:outline-none cursor-pointer py-1"
          >
            <option value="recent">Most Recent</option>
            <option value="rating">Highest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-3 pt-1">
        {filteredReviews.length === 0 ? (
          <div className="py-8 px-4 text-center bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
            <p className="text-xs text-gray-600 font-medium">
              {starFilter !== null
                ? `No ${starFilter}-star reviews found.`
                : 'No candidate reviews yet for this title.'}
            </p>
            <button
              onClick={() => {
                setStarFilter(null);
                setIsFormOpen(true);
              }}
              className="text-xs font-bold text-[#4029AB] hover:underline cursor-pointer"
            >
              Be the first to share your rating &amp; feedback!
            </button>
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const hasVoted = votedIds.has(rev.id) || hasUserVotedHelpful(rev.id);
            const userInitial = (rev.userName || rev.user || 'S').charAt(0).toUpperCase();

            return (
              <div
                key={rev.id}
                className="p-3.5 sm:p-4 rounded-xl border border-gray-100 bg-white space-y-2 hover:border-gray-200 transition-colors"
              >
                {/* Author Info Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {rev.userAvatar || rev.avatar ? (
                      <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-200 shrink-0">
                        <Image
                          src={rev.userAvatar || rev.avatar || ''}
                          alt={rev.userName || rev.user}
                          fill
                          sizes="28px"
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center font-bold text-xs shrink-0">
                        {userInitial}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-950">
                          {rev.userName || rev.user}
                        </span>
                        {rev.verifiedPurchase && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded-sm">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Verified Buyer</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-medium text-gray-400">
                    {rev.date || 'Recent'}
                  </span>
                </div>

                {/* Star Rating Display */}
                <div className="flex items-center gap-1 text-[#4029AB]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${
                        s <= Math.round(rev.rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-200 fill-gray-200'
                      }`}
                    />
                  ))}
                  {rev.title && (
                    <span className="ml-1.5 text-xs font-bold text-gray-900 line-clamp-1">
                      {rev.title}
                    </span>
                  )}
                </div>

                {/* Review Comment Text */}
                <p className="text-xs text-gray-700 leading-relaxed break-words whitespace-pre-line">
                  {rev.comment}
                </p>

                {/* Helpful Vote Button */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
                  <button
                    onClick={() => handleVoteHelpful(rev)}
                    disabled={hasVoted}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      hasVoted
                        ? 'text-emerald-700 bg-emerald-50 cursor-default'
                        : 'text-gray-500 hover:text-[#4029AB] hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsUp className={`w-3 h-3 ${hasVoted ? 'fill-emerald-600 text-emerald-600' : ''}`} />
                    <span>
                      {hasVoted ? 'Helpful' : 'Helpful'}
                      {rev.helpfulCount && rev.helpfulCount > 0 ? ` (${rev.helpfulCount})` : ''}
                    </span>
                  </button>

                  <span className="text-[10px] text-gray-400 select-none">
                    Reviewed on BooksCircle
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
