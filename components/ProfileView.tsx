'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Mail,
  Share2,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  Send,
  MessageCircle,
  LogIn,
  LogOut,
  RefreshCw,
  Heart,
  ShoppingCart,
} from 'lucide-react';
import { UserProfile } from '@/components/Header';
import { Book } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import {
  getWishlistIdsFromLocal,
  getWishlistBooksFromLocal,
  removeFromWishlistAction,
  subscribeToWishlistChanges,
} from '@/lib/services/wishlist';

interface ProfileViewProps {
  currentUser: UserProfile | null;
  purchasedCount?: number;
  allBooks?: Book[];
  onSelectBook?: (book: Book) => void;
  onAddToCart?: (book: Book, e: React.MouseEvent) => void;
  onBuyNow?: (book: Book) => void;
  onNavigateToPurchased?: () => void;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  cartBookIds?: Set<string>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  allBooks = [],
  onSelectBook,
  onAddToCart,
  onBuyNow,
  onGoogleSignIn,
  onSignOut,
  cartBookIds = new Set(),
}) => {
  const [copied, setCopied] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    try {
      setWishlistIds(getWishlistIdsFromLocal());
    } catch {}

    const unsub = subscribeToWishlistChanges((ids) => {
      setWishlistIds(ids);
    });
    return () => unsub();
  }, []);

  // Resolve full book objects for wishlist items
  const wishlistedBooks: Book[] = React.useMemo(() => {
    const cachedBooks = getWishlistBooksFromLocal();
    const booksMap = new Map<string, Book>();

    allBooks.forEach((b) => booksMap.set(b.id, b));
    cachedBooks.forEach((b) => {
      if (!booksMap.has(b.id)) booksMap.set(b.id, b);
    });

    return wishlistIds
      .map((id) => booksMap.get(id))
      .filter((b): b is Book => Boolean(b));
  }, [wishlistIds, allBooks]);

  const handleRemoveFromWishlist = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromWishlistAction(bookId);
    showToast('Removed from wishlist');
  };

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://bookscircle.org';
  };

  const shareText =
    'Check out BooksCircle for competitive exam prep books, curated study guides, and instant offline PDF reading!';

  // Primary Native Web Share API
  const handleNativeShare = async () => {
    const url = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BooksCircle - Digital PDF Library',
          text: shareText,
          url: url,
        });
        showToast('Shared successfully!');
      } catch {
        // Share dismissed
      }
    } else {
      handleCopyLink();
    }
  };

  // Copy Link to Clipboard
  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setCopied(true);
      showToast('App link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Could not copy link to clipboard');
    }
  };

  // Trigger Sign In
  const handleGoogleAuth = async () => {
    setIsSigningIn(true);
    try {
      await onGoogleSignIn();
    } finally {
      setIsSigningIn(false);
    }
  };

  // Social Share Handlers
  const handleWhatsAppShare = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(shareText + '\n');
    window.open(`https://api.whatsapp.com/send?text=${text}${url}`, '_blank');
  };

  const handleTelegramShare = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent('Recommended: BooksCircle PDF Library');
    const body = encodeURIComponent(`${shareText}\n\nVisit: ${getShareUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const displayUserName = currentUser?.displayName || 'Guest Reader';
  const displayUserEmail = currentUser?.email || 'Not signed in';
  const userInitial = displayUserName.charAt(0).toUpperCase();

  return (
    <div className="w-full px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-8 bg-white">
      {/* 1. Minimal Profile Identity Header (Seamless, Unboxed) */}
      <section id="profile-identity-section" className="flex items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4 min-w-0">
          {/* Avatar */}
          {currentUser?.photoURL ? (
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0 border border-gray-200">
              <Image
                src={currentUser.photoURL}
                alt={displayUserName}
                fill
                sizes="64px"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white">
                <ShieldCheck className="w-2.5 h-2.5" />
              </div>
            </div>
          ) : (
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xl sm:text-2xl font-black shrink-0">
              <span>{userInitial}</span>
              {currentUser && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white">
                  <ShieldCheck className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          )}

          {/* User Info Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-gray-950 truncate">{displayUserName}</h2>
              {currentUser ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shrink-0">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-gray-100 text-gray-600 rounded-full shrink-0">
                  Guest
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5 font-medium truncate">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="font-mono text-gray-600 truncate">{displayUserEmail}</span>
            </div>
          </div>
        </div>

        {/* Action Button: Login / Sign Out */}
        <div className="shrink-0">
          {!currentUser ? (
            <button
              id="profile-login-btn"
              onClick={handleGoogleAuth}
              disabled={isSigningIn}
              className="px-4 py-2 bg-[#4029AB] hover:bg-[#34208e] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSigningIn ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              <span>Login</span>
            </button>
          ) : (
            <button
              id="profile-signout-btn"
              onClick={() => {
                onSignOut();
                showToast('Signed out successfully.');
              }}
              className="px-3.5 py-1.5 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-700 hover:text-red-600 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. Share BooksCircle App (Seamless Section) */}
      <section id="profile-share-section" className="space-y-3 pb-6 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-bold text-gray-950 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-[#4029AB]" />
            <span>Share BooksCircle App</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Recommend study materials and books to friends and colleagues.
          </p>
        </div>

        {/* Quick Share Options Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'border-gray-200 hover:bg-gray-50 text-gray-800'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          {/* Telegram */}
          <button
            onClick={handleTelegramShare}
            className="py-2.5 px-3 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-sky-600" />
            <span>Telegram</span>
          </button>

          {/* Email */}
          <button
            onClick={handleEmailShare}
            className="py-2.5 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-gray-600" />
            <span>Email</span>
          </button>
        </div>
      </section>

      {/* 3. My Saved Wishlist (Unboxed, Continuous Placement at the Bottom) */}
      <section id="profile-wishlist-section" className="space-y-4 pt-1">
        <div className="space-y-1">
          {/* Top Row: Icon, Title & Number of Books */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#4029AB] fill-[#4029AB]" />
              <h3 className="text-base font-bold text-gray-950">
                My Saved Wishlist
              </h3>
            </div>
            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-full shrink-0">
              {wishlistedBooks.length} {wishlistedBooks.length === 1 ? 'Book' : 'Books'}
            </span>
          </div>
          {/* Second Row: Description */}
          <p className="text-xs text-gray-500">
            Books you have bookmarked to read or buy later
          </p>
        </div>

        {wishlistedBooks.length === 0 ? (
          <div className="py-10 px-4 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 space-y-2">
            <Heart className="w-7 h-7 text-gray-300 mx-auto" />
            <p className="text-xs font-semibold text-gray-600">Your wishlist is currently empty</p>
            <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
              Tap the heart icon on any book card in the catalog to save it here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
            {wishlistedBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook && onSelectBook(book)}
                className="py-3.5 flex items-center gap-3.5 group cursor-pointer hover:bg-gray-50/60 px-2 rounded-xl transition-all"
              >
                {/* Book Thumbnail */}
                <div className="relative w-12 aspect-[3/4] shrink-0 overflow-hidden bg-gray-100 border border-gray-200 shadow-2xs">
                  <Image
                    src={book.cover || DEFAULT_BOOK_COVER}
                    alt={book.title}
                    fill
                    unoptimized
                    sizes="48px"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-[#4029AB] uppercase tracking-wider">
                    {book.category}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-[#4029AB] transition-colors">
                    {book.title}
                  </h4>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xs sm:text-sm font-black text-gray-950">
                      ₹{book.buy_price}
                    </span>
                    {book.list_price && book.list_price > book.buy_price && (
                      <span className="text-[10px] text-gray-400 line-through">
                        ₹{book.list_price}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {onAddToCart && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(book, e);
                      }}
                      className={`p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                        cartBookIds.has(book.id)
                          ? 'bg-[#4029AB] text-white border-[#4029AB]'
                          : 'border-gray-200 text-gray-700 bg-white hover:border-[#4029AB] hover:text-[#4029AB]'
                      }`}
                      title={cartBookIds.has(book.id) ? 'In Cart' : 'Add to Cart'}
                      aria-label="Add to cart"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onBuyNow && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBuyNow(book);
                      }}
                      className="px-2.5 py-1.5 bg-[#4029AB] hover:bg-[#34208e] text-white text-[10px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                    >
                      Buy Now
                    </button>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemoveFromWishlist(book.id, e)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                    title="Remove from Wishlist"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-950 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 pointer-events-none">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
