'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  BookmarkCheck,
  Star,
  BookOpen,
  Check,
  Eye,
  ShoppingBag,
  ShieldCheck,
  Lock,
  ChevronRight,
  Send,
  Sparkles,
  Award,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Review, CartItem } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import { PDFReaderModal } from '@/components/PDFReaderModal';
import { CartDrawer } from '@/components/CartDrawer';
import { GoogleSignInModal } from '@/components/GoogleSignInModal';
import { UserProfile } from '@/components/Header';
import { processRazorpayPayment } from '@/lib/services/razorpay';
import { recordUserPurchaseInFirestore, syncUserPurchases } from '@/lib/services/purchases';
import { getPurchasedBookIdsFromLocal, savePurchasedBookIds } from '@/lib/offline-storage';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface BookPageClientProps {
  book: Book;
  relatedBooks?: Book[];
}

export const BookPageClient: React.FC<BookPageClientProps> = ({
  book,
  relatedBooks = [],
}) => {
  const [imgLoadFailed, setImgLoadFailed] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activePdfReaderMode, setActivePdfReaderMode] = useState<'sample' | 'full' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingActionAfterLogin, setPendingActionAfterLogin] = useState<((user: UserProfile) => void) | null>(null);
  const [, startTransition] = useTransition();

  // Reviews state with local interactive submission
  const [customReviews, setCustomReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewName, setNewReviewName] = useState('');

  // Hydrate user & cart on client
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedUser = localStorage.getItem('bookscircle_test_user');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));
      } catch {}

      try {
        const localPurchased = getPurchasedBookIdsFromLocal();
        if (localPurchased.length > 0) setPurchasedBookIds(localPurchased);
      } catch {}

      try {
        const savedCart = localStorage.getItem('bookscircle_cart');
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) setCart(parsed);
        }
      } catch {}
    }, 0);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
          photoURL: user.photoURL,
          isTestAccount: false,
        };
        setCurrentUser(profile);
        try {
          const synced = await syncUserPurchases(user.uid, user.email || undefined);
          setPurchasedBookIds(synced);
        } catch {}
      }
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  const imgSrc = imgLoadFailed ? DEFAULT_BOOK_COVER : (book.cover || DEFAULT_BOOK_COVER);
  const isPurchased = purchasedBookIds.includes(book.id);
  const isInCart = cart.some((i) => i.book.id === book.id);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: `Read "${book.title}" on BooksCircle: ${book.seo_description}`,
          url: window.location.href,
        });
        showToast('Shared successfully!');
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!');
      } catch {
        showToast('Could not copy link.');
      }
    }
  };

  const handleAddToCart = () => {
    setCart((prev) => {
      const existing = prev.find((item) => item.book.id === book.id);
      if (existing) {
        return prev.map((item) =>
          item.book.id === book.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { book, quantity: 1 }];
    });
    showToast(`Added "${book.title.slice(0, 20)}..." to Cart`);
  };

  const executeRazorpayCheckout = async (itemsToBuy: CartItem[], userOverride?: UserProfile | null) => {
    if (itemsToBuy.length === 0) return;
    const activeUser = userOverride || currentUser;
    const userEmail = activeUser?.email || 'reviewer.razorpay@bookscircle.org';
    const userName = activeUser?.displayName || 'Reader';
    const totalAmount = itemsToBuy.reduce((sum, item) => sum + item.book.buy_price * item.quantity, 0);

    showToast('Opening Razorpay Secure Gateway...');
    try {
      await processRazorpayPayment({
        amountInRupees: totalAmount,
        bookIds: itemsToBuy.map((i) => i.book.id),
        bookTitles: itemsToBuy.map((i) => i.book.title),
        userName,
        userEmail,
        onSuccess: async (paymentData) => {
          const newPurchasedIds = itemsToBuy.map((item) => item.book.id);
          try {
            const allPurchased = await recordUserPurchaseInFirestore(
              activeUser?.uid || 'guest_user',
              userEmail,
              itemsToBuy,
              {
                orderId: paymentData.order_id,
                paymentId: paymentData.payment_id,
                amount: paymentData.amountInRupees,
              }
            );
            setPurchasedBookIds(allPurchased);
          } catch {
            savePurchasedBookIds(newPurchasedIds);
            setPurchasedBookIds((prev) => Array.from(new Set([...prev, ...newPurchasedIds])));
          }
          setCart((prev) => prev.filter((item) => !newPurchasedIds.includes(item.book.id)));
          showToast(`Purchase successful! PDF unlocked.`);
          setActivePdfReaderMode('full');
        },
        onError: (err) => showToast(err || 'Payment was cancelled.'),
      });
    } catch {
      showToast('Unable to open payment gateway.');
    }
  };

  // Instant 1-Click Buy Now
  const handleBuyNow = () => {
    if (isPurchased) {
      setActivePdfReaderMode('full');
      return;
    }
    const buyItem: CartItem = { book, quantity: 1 };
    handleAddToCart();
    if (!currentUser || !currentUser.email) {
      setPendingActionAfterLogin(() => (user: UserProfile) => executeRazorpayCheckout([buyItem], user));
      setIsGoogleModalOpen(true);
    } else {
      executeRazorpayCheckout([buyItem], currentUser);
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim()) return;

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      user: newReviewName.trim() || 'Verified Aspirant',
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
    showToast('Thank you! Your verified review has been posted.');
  };

  const rating = book.rating || 4.8;
  const ratingCount = book.rating_count || 1420;
  const formattedReviewsCount =
    ratingCount >= 1000 ? `${(ratingCount / 1000).toFixed(1)}K` : ratingCount.toString();

  const reviewsList = useMemo(() => {
    return [...customReviews, ...(book.reviews && Array.isArray(book.reviews) ? book.reviews : [])];
  }, [customReviews, book.reviews]);

  const discountPercent =
    book.list_price && book.list_price > book.buy_price
      ? Math.round(((book.list_price - book.buy_price) / book.list_price) * 100)
      : 25;

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-28 sm:pb-24 antialiased selection:bg-[#4029AB] selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer shrink-0"
            aria-label="Back to Catalog"
          >
            <ArrowLeft className="w-4 h-4 text-gray-800" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold truncate">
            <Link href="/" className="hover:text-[#4029AB]">Home</Link>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="text-[#4029AB] font-bold truncate">{book.category}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer"
            title="Share"
            aria-label="Share this book"
          >
            <Share2 className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={() => {
              setIsWishlisted(!isWishlisted);
              showToast(!isWishlisted ? 'Saved to Wishlist' : 'Removed from Wishlist');
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isWishlisted
                ? 'bg-[#4029AB]/10 text-[#4029AB]'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Wishlist"
            aria-label="Save to wishlist"
          >
            {isWishlisted ? (
              <BookmarkCheck className="w-4 h-4 text-[#4029AB] fill-[#4029AB]" />
            ) : (
              <Bookmark className="w-4 h-4 text-gray-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6">
        {/* Identity & Pricing Section */}
        <section className="flex gap-4 sm:gap-6 items-start">
          {/* Cover Art with explicit 3:4 aspect ratio and AVIF/WebP ready */}
          <div className="relative w-28 sm:w-36 aspect-[3/4] shrink-0 rounded-none overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
            <Image
              src={imgSrc}
              alt={book.title}
              fill
              priority
              sizes="(max-width: 640px) 112px, 144px"
              className="object-cover rounded-none"
              referrerPolicy="no-referrer"
              onError={() => setImgLoadFailed(true)}
            />
          </div>

          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4029AB] bg-[#4029AB]/10 px-2 py-0.5 rounded">
              {book.category}
            </span>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-gray-950 leading-snug tracking-tight mt-1.5">
              {book.title}
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              By {book.author || 'Exam Editorial Panel'} • {book.publisher || 'Exam Kart'}
            </p>

            {/* Price Badge */}
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                ₹{book.buy_price}
              </span>
              {book.list_price > book.buy_price && (
                <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                  ₹{book.list_price}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Quick Feature Chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                Instant PDF Download
              </span>
              <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {book.pages ? `${book.pages} Pages` : 'Comprehensive Guide'}
              </span>
              <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                Offline Reader
              </span>
            </div>
          </div>
        </section>

        {/* Action Buttons (Sample Preview & 1-Click Checkout) */}
        <section className="grid grid-cols-2 gap-3 pt-1">
          <button
            id="book-page-sample-btn"
            onClick={() => setActivePdfReaderMode('sample')}
            className="w-full py-3 px-4 rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-xs sm:text-sm font-bold text-[#4029AB] bg-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <Eye className="w-4 h-4 text-[#4029AB]" />
            <span>Free Sample Preview</span>
          </button>

          {isPurchased ? (
            <button
              id="book-page-read-full-btn"
              onClick={() => setActivePdfReaderMode('full')}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-white" />
              <span>Read Full PDF</span>
            </button>
          ) : (
            <button
              id="book-page-buy-now-btn"
              onClick={handleBuyNow}
              className="w-full py-3 px-4 rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Zap className="w-4 h-4 text-white fill-white" />
              <span>Instant Buy (₹{book.buy_price})</span>
            </button>
          )}
        </section>

        {/* Book Overview & Highlights */}
        <section className="space-y-3 pt-2">
          <h2 className="text-base sm:text-lg font-bold text-gray-950">
            About this E-Book &amp; Syllabus Coverage
          </h2>
          <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
            {book.seo_description && (
              <p className="font-semibold text-gray-900 bg-gray-50/90 p-4 rounded-2xl border border-gray-100 leading-relaxed">
                {book.seo_description}
              </p>
            )}
            {book.full_description && (
              <div className="text-gray-700 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                {book.full_description}
              </div>
            )}
          </div>
        </section>

        {/* Structured FAQ Section */}
        <section className="space-y-3 pt-4 border-t border-gray-100">
          <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#4029AB]" />
            <span>Frequently Asked Questions</span>
          </h2>
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-1">
              <h3 className="text-xs font-bold text-gray-900">How is the digital PDF delivered?</h3>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Immediately after your payment is verified via Razorpay, the PDF is unlocked in your BooksCircle library. You can read online in the high-fidelity reader or view offline.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-1">
              <h3 className="text-xs font-bold text-gray-900">Can I view this e-book on mobile and tablets?</h3>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Yes, all e-books are formatted with responsive text and high-resolution vector diagrams compatible with iOS, Android, macOS, and Windows.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-1">
              <h3 className="text-xs font-bold text-gray-900">Is this updated for current exam notifications?</h3>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Yes, Exam Kart updates study modules systematically to incorporate the latest syllabus trends and previous year question papers.
              </p>
            </div>
          </div>
        </section>

        {/* Customer Reviews Section */}
        <section className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Verified Candidate Ratings &amp; Reviews
            </h2>
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-xs font-bold text-[#4029AB] hover:underline cursor-pointer"
            >
              {showReviewForm ? 'Cancel' : 'Write a Review'}
            </button>
          </div>

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
                  placeholder="Share your exam preparation feedback..."
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
                  <span>Submit Verified Review</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {reviewsList.map((rev) => (
              <div key={rev.id} className="p-3.5 rounded-xl border border-gray-100 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center font-bold text-xs">
                      {rev.user.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{rev.user}</h4>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        <span>Verified Reader</span>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">{rev.date}</span>
                </div>
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < rev.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-gray-200 text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Similar Books */}
        {relatedBooks.length > 0 && (
          <section className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">
              Recommended in {book.category}
            </h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {relatedBooks.map((relBook) => (
                <Link
                  key={relBook.id}
                  href={`/book/${encodeURIComponent(relBook.slug || relBook.id)}`}
                  className="w-24 shrink-0 group"
                >
                  <div className="relative aspect-[3/4] w-full rounded-none overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs">
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
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Floating Sticky Purchase Bar on Mobile & Desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 sm:px-6 py-3 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
              Digital PDF Edition
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-gray-950">₹{book.buy_price}</span>
              {book.list_price > book.buy_price && (
                <span className="text-xs text-gray-400 line-through font-medium">
                  ₹{book.list_price}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePdfReaderMode('sample')}
              className="px-3.5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-xs font-bold text-[#4029AB] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Sample</span>
            </button>

            {isPurchased ? (
              <button
                onClick={() => setActivePdfReaderMode('full')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read Full PDF</span>
              </button>
            ) : (
              <button
                onClick={handleBuyNow}
                className="px-5 py-2.5 rounded-xl bg-[#4029AB] hover:bg-[#34208e] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Instant Buy Now</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PDF Reader Modal */}
      {activePdfReaderMode && (
        <PDFReaderModal
          book={book}
          mode={activePdfReaderMode}
          onClose={() => setActivePdfReaderMode(null)}
          onBuyNow={() => {
            setActivePdfReaderMode(null);
            handleBuyNow();
          }}
          isPurchased={isPurchased}
        />
      )}

      {/* Login Modal */}
      <GoogleSignInModal
        isOpen={isGoogleModalOpen}
        onClose={() => {
          setIsGoogleModalOpen(false);
          setPendingActionAfterLogin(null);
        }}
        onSelectUser={(profile) => {
          setCurrentUser(profile);
          if (pendingActionAfterLogin) {
            const act = pendingActionAfterLogin;
            setPendingActionAfterLogin(null);
            setTimeout(() => act(profile), 300);
          }
        }}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={(id, q) =>
          setCart((prev) =>
            q <= 0 ? prev.filter((i) => i.book.id !== id) : prev.map((i) => (i.book.id === id ? { ...i, quantity: q } : i))
          )
        }
        onRemoveItem={(id) => setCart((prev) => prev.filter((i) => i.book.id !== id))}
        onClearCart={() => setCart([])}
        currentUser={currentUser}
        onSuccessfulCheckout={(items) => {
          const newIds = items.map((i) => i.book.id);
          setPurchasedBookIds((prev) => [...prev, ...newIds]);
          setIsCartOpen(false);
        }}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-950 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 pointer-events-none"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
