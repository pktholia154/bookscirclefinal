'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
  Heart,
  FileCode,
  Smartphone,
} from 'lucide-react';
import { Book, CartItem } from '@/lib/types';
import { DEFAULT_BOOK_COVER, FREE_SAMPLE_BOOK_ID } from '@/lib/data';
import { SampleSwitcher } from '@/components/SampleSwitcher';
import { InstallAppBanner } from '@/components/InstallAppBanner';
import { IOSHomeInstallBanner } from '@/components/IOSHomeInstallBanner';
import { IOSInstallGuideModal } from '@/components/IOSInstallGuideModal';
import { InstallSuccessModal } from '@/components/InstallSuccessModal';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { BottomNav, TabKey } from '@/components/BottomNav';
import { triggerNativeLoading } from '@/components/NativePageLoadingIndicator';
import {
  executePurchaseQuickJump,
  subscribeToPurchasesUpdated,
  setTargetHomeTab,
} from '@/lib/services/quick-jump';
import { UserProfile } from '@/components/Header';

const CartDrawer = dynamic(
  () => import('@/components/CartDrawer').then((m) => m.CartDrawer),
  { ssr: false }
);
const PDFReaderModal = dynamic(
  () => import('@/components/PDFReaderModal').then((m) => m.PDFReaderModal),
  { ssr: false }
);
const MarkdownReaderModal = dynamic(
  () => import('@/components/MarkdownReaderModal').then((m) => m.MarkdownReaderModal),
  { ssr: false }
);
import { processRazorpayPayment, loadRazorpayScript } from '@/lib/services/razorpay';
import { recordUserPurchaseInFirestore, syncUserPurchases, subscribeToUserPurchases } from '@/lib/services/purchases';
import { syncUserProfileToFirestore } from '@/lib/services/users';
import { getPurchasedBookIdsFromLocal, savePurchasedBookIds } from '@/lib/offline-storage';
import { addToCartAction, getCartFromLocal, subscribeToCartChanges } from '@/lib/services/cart';
import { getWishlistIdsFromLocal, toggleWishlistAction, subscribeToWishlistChanges } from '@/lib/services/wishlist';
import { subscribeToFirestoreBook } from '@/lib/services/books';
import { getCachedCartTierDiscountSync } from '@/lib/services/discounts';
import { calculateCartSummary } from '@/lib/services/cart';
import {
  auth,
  signInWithGoogle,
  getCachedAuthUserSync,
  subscribeToUnifiedAuthState,
  persistAndBroadcastAuthUser,
} from '@/lib/firebase';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { MarkdownCodeBlock, MarkdownCodeElement } from '@/components/MarkdownCodeBlock';

interface BookPageClientProps {
  book: Book;
  relatedBooks?: Book[];
}

const savePendingCheckoutSession = (items: CartItem[]) => {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'bookscircle_pending_checkout',
        JSON.stringify({
          items,
          timestamp: Date.now(),
        })
      );
    }
  } catch {}
};

const getPendingCheckoutItems = (): CartItem[] | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem('bookscircle_pending_checkout');
    if (raw) {
      const parsed = JSON.parse(raw);
      const now = Date.now();
      if (
        parsed &&
        Array.isArray(parsed.items) &&
        parsed.items.length > 0 &&
        now - (parsed.timestamp || 0) < 15 * 60 * 1000
      ) {
        sessionStorage.removeItem('bookscircle_pending_checkout');
        return parsed.items as CartItem[];
      }
    }
  } catch {}
  return null;
};

export const BookPageClient: React.FC<BookPageClientProps> = ({
  book: initialBook,
  relatedBooks = [],
}) => {
  const router = useRouter();
  const [currentBook, setCurrentBook] = useState<Book>(initialBook);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activePdfReaderMode, setActivePdfReaderMode] = useState<'sample' | 'full' | null>(null);
  const [activeMdReaderMode, setActiveMdReaderMode] = useState<'sample' | 'full' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // PWA Install prompt handling
  const {
    isInstallable,
    isIOSPromptOpen,
    isInstallSuccessOpen,
    promptInstall,
    closeIOSPrompt,
    closeInstallSuccess,
  } = usePWAInstall();
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>([FREE_SAMPLE_BOOK_ID]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingActionAfterLogin, setPendingActionAfterLogin] = useState<((user: UserProfile) => void) | null>(null);
  const [, startTransition] = useTransition();

  const totalCartCount = useMemo(() => {
    return (Array.isArray(cart) ? cart : []).reduce((acc, i) => acc + (i?.quantity || 1), 0);
  }, [cart]);

  // Prefetch critical destinations for ultra-fast instant transitions
  useEffect(() => {
    router.prefetch('/');
    router.prefetch('/purchased');
  }, [router]);

  const handleTabChange = (tab: TabKey) => {
    if (tab === 'cart') {
      setIsCartOpen(true);
      return;
    }
    triggerNativeLoading(120);
    startTransition(() => {
      if (tab === 'purchased') {
        router.push('/purchased');
        return;
      }
      setTargetHomeTab(tab || 'home');
      router.push('/');
    });
  };

  // Keep in sync with initialBook prop
  useEffect(() => {
    setCurrentBook(initialBook);
    setImgLoadFailed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBook.id]);

  // Preserve server-hydrated structured preview fields when client Firestore snapshot updates
  useEffect(() => {
    if (!initialBook.id) return;
    const unsubscribe = subscribeToFirestoreBook(initialBook.id, (liveDoc) => {
      if (liveDoc) {
        setCurrentBook((prev) => ({
          ...liveDoc,
          tableOfContents: prev.tableOfContents || liveDoc.tableOfContents,
          sampleQuestions: prev.sampleQuestions || liveDoc.sampleQuestions,
        }));
      }
    });
    return () => unsubscribe();
  }, [initialBook.id]);

  const book = currentBook;

  // Hydrate user, cart & wishlist on client
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const cachedUser = getCachedAuthUserSync();
        if (cachedUser) setCurrentUser(cachedUser);
      } catch {}

      try {
        const localPurchased = getPurchasedBookIdsFromLocal();
        if (localPurchased.length > 0) setPurchasedBookIds(localPurchased);
      } catch {}

      try {
        const savedCart = getCartFromLocal();
        if (savedCart && savedCart.length > 0) {
          setCart(savedCart);
        }
      } catch {}

      try {
        const ids = getWishlistIdsFromLocal();
        setIsWishlisted(ids.includes(book.id));
      } catch {}
    }, 0);

    const unsubCart = subscribeToCartChanges((newCart) => {
      setCart(newCart);
    });

    const unsubWishlist = subscribeToWishlistChanges((wishlistIds) => {
      setIsWishlisted(wishlistIds.includes(book.id));
    });

    const unsub = subscribeToUnifiedAuthState(async (profile) => {
      setCurrentUser(profile);
      if (profile?.uid) {
        try {
          const synced = await syncUserPurchases(profile.uid, profile.email || undefined);
          setPurchasedBookIds(synced);
        } catch {}
      }
    });

    const unsubPurchasesUpdated = subscribeToPurchasesUpdated((newIds) => {
      setPurchasedBookIds((prev) => Array.from(new Set([...prev, ...newIds])));
    });

    return () => {
      clearTimeout(timer);
      unsubCart();
      unsubWishlist();
      unsub();
      unsubPurchasesUpdated();
    };
  }, [book.id]);

  const handleToggleWishlist = () => {
    const res = toggleWishlistAction(book);
    setIsWishlisted(res.isWishlisted);
    showToast(res.isWishlisted ? 'Saved to Wishlist' : 'Removed from Wishlist');
  };

  // Real-time continuous listener for Firebase DB purchase updates
  useEffect(() => {
    if (!currentUser) return;
    const unsubPurchases = subscribeToUserPurchases(
      currentUser.uid,
      currentUser.email || undefined,
      (syncedIds) => {
        setPurchasedBookIds(syncedIds);
      }
    );
    return () => {
      unsubPurchases();
    };
  }, [currentUser]);

  const imgSrc = imgLoadFailed ? DEFAULT_BOOK_COVER : (book.cover || DEFAULT_BOOK_COVER);
  const isPurchased = purchasedBookIds.includes(book.id);
  const isInCart = (Array.isArray(cart) ? cart : []).some((i) => i?.book?.id === book.id);

  const showToast = (msg: string | null, duration = 2500) => {
    if (!msg) {
      setToastMessage(null);
      return;
    }
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, duration);
  };

  const autoResumePendingCheckout = (user: UserProfile) => {
    const pendingItems = getPendingCheckoutItems();
    if (pendingItems) {
      showToast('Sign in complete! Opening payment gateway...', 2500);
      setTimeout(() => {
        executeRazorpayCheckout(pendingItems, user);
      }, 350);
      return true;
    }
    return false;
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
    if (isPurchased) {
      showToast(`You already own "${book.title.slice(0, 20)}...". Available in your library.`);
      return;
    }
    const { updatedCart, isNewItem } = addToCartAction(book);
    setCart(updatedCart);
    if (isNewItem) {
      showToast(`Added "${book.title.slice(0, 20)}..." to Cart`);
    } else {
      showToast(`"${book.title.slice(0, 20)}..." is already in your Cart`);
    }
  };

  const executeRazorpayCheckout = async (itemsToBuy: CartItem[], userOverride?: UserProfile | null) => {
    if (itemsToBuy.length === 0) return;
    const activeUser = userOverride || currentUser;
    const userEmail = activeUser?.email || '';
    const userName = activeUser?.displayName || 'Reader';
    const userId = activeUser?.uid || 'guest_user';
    const currentDiscount = getCachedCartTierDiscountSync();
    const summary = calculateCartSummary(itemsToBuy, currentDiscount);
    const totalAmount = summary.subtotal;

    showToast('Opening Razorpay Secure Gateway...', 2500);
    try {
      await processRazorpayPayment({
        amountInRupees: totalAmount,
        bookIds: itemsToBuy.map((i) => i.book.id),
        bookTitles: itemsToBuy.map((i) => i.book.title),
        userId,
        userName,
        userEmail,
        onSuccess: (paymentData) => {
          executePurchaseQuickJump({
            itemsToBuy,
            paymentData,
            currentUser: activeUser,
            router,
            onSuccessToast: (msg) => showToast(msg, 3000),
            onBeforeRedirect: () => setIsCartOpen(false),
          });
        },
        onError: (err) => showToast(err || 'Payment was cancelled.', 3500),
      });
    } catch {
      showToast('Unable to open payment gateway.', 3500);
    }
  };

  const triggerDirectGoogleSignIn = async (callback?: (user: UserProfile) => void) => {
    try {
      showToast('Initiating Google sign in...', 2500);
      const res = await signInWithGoogle();
      if (res.user) {
        const profile: UserProfile = res.profile || {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || (res.user.email ? res.user.email.split('@')[0] : 'Google User'),
          photoURL: res.user.photoURL,
        };
        setCurrentUser(profile);
        persistAndBroadcastAuthUser(profile, 'local');
        showToast(`Signed in as ${profile.displayName || profile.email}`, 3000);
        syncUserProfileToFirestore({
          uid: profile.uid,
          email: profile.email,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          providerId: 'google.com',
        }).catch((err) => console.warn('Sync profile note:', err));
        
        try {
          const mergedBookIds = await syncUserPurchases(profile.uid, profile.email || undefined);
          setPurchasedBookIds(mergedBookIds);
        } catch {
          // Sync note
        }

        const resumed = autoResumePendingCheckout(profile);

        if (!resumed && callback) {
          callback(profile);
        }
      } else if (res.fallbackNeeded) {
        showToast('Firebase Google Sign-In domain check in progress.', 3500);
      } else if (res.cancelled) {
        showToast('Google sign in was cancelled.', 2500);
      }
    } catch (err: any) {
      if (!err?.message?.includes('popup-closed-by-user')) {
        showToast('Google sign in error: ' + (err?.message || 'Failed'), 3500);
      }
    }
  };

  // Direct 1-Click Buy Now without adding to cart
  const handleBuyNow = () => {
    if (isPurchased) {
      setActivePdfReaderMode('full');
      return;
    }
    const buyItem: CartItem = { book, quantity: 1 };
    if (!currentUser || !currentUser.email) {
      savePendingCheckoutSession([buyItem]);
      setPendingActionAfterLogin(() => (user: UserProfile) => {
        executeRazorpayCheckout([buyItem], user);
      });
      triggerDirectGoogleSignIn((loggedInUser: UserProfile) => {
        executeRazorpayCheckout([buyItem], loggedInUser);
      });
    } else {
      executeRazorpayCheckout([buyItem], currentUser);
    }
  };

  const cleanSummaryText = useMemo(() => {
    const raw = book.seoDescription || book.seo_description || '';
    return raw.replace(/\*\*+/g, '').replace(/__+/g, '').replace(/^#+\s+/gm, '').trim();
  }, [book.seoDescription, book.seo_description]);

  // Only show genuine tags from the book document without padding filler tags
  const displayTags = useMemo(() => {
    const rawTags = Array.isArray(book.tags) ? book.tags.filter((t) => Boolean(t && t.trim())) : [];
    return Array.from(new Set(rawTags)).slice(0, 6);
  }, [book.tags]);

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 sm:pb-28 antialiased selection:bg-[#4029AB] selection:text-white">
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
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold truncate">
            <Link href="/" className="hover:text-[#4029AB]">Home</Link>
            <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
            <Link
              href={`/category/${encodeURIComponent(
                book.categorySlug ||
                  (book.category || 'all').toLowerCase().trim().replace(/\s+/g, '-')
              )}`}
              className="text-[#4029AB] font-bold truncate hover:underline"
            >
              {book.category}
            </Link>
          </nav>
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
              unoptimized
              sizes="(max-width: 640px) 112px, 144px"
              className="object-cover rounded-none"
              referrerPolicy="no-referrer"
              onError={() => setImgLoadFailed(true)}
            />
            {/* Top-Right Cover Wishlist Heart Button */}
            <button
              id={`ssr-detail-cover-wishlist-${book.id}`}
              onClick={handleToggleWishlist}
              className={`absolute top-1.5 right-1.5 w-6.5 h-6.5 rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-90 cursor-pointer z-10 ${
                isWishlisted
                  ? 'bg-white text-rose-600'
                  : 'bg-white/85 text-gray-700 hover:bg-white hover:text-rose-600'
              }`}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              title={isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-gray-700'
                }`}
              />
            </button>
          </div>

          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4029AB] bg-[#4029AB]/10 px-2 py-0.5 rounded">
              {book.category}
            </span>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-gray-950 leading-snug tracking-tight mt-1.5">
              {book.title}
            </h1>
            <p className="text-xs text-gray-500 font-normal mt-1">
              {book.publisher || 'Mocktime Publication'}
            </p>

            {/* Metadata row below publication: category, language, type (values only, no labels) */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 mt-2 pt-1.5 border-t border-gray-100">
              <span className="font-medium text-gray-700">{book.category || 'General'}</span>
              <span className="text-gray-300 text-[9px]">•</span>
              <span>{book.language || 'English'}</span>
              <span className="text-gray-300 text-[9px]">•</span>
              <span>{book.type || 'PDF Ebook'}</span>
            </div>

            {/* Price Badge */}
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                ₹{book.buy_price}
              </span>
              {book.list_price && book.list_price > book.buy_price && (
                <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                  ₹{book.list_price}
                </span>
              )}
              {book.list_price && book.list_price > book.buy_price && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {Math.round(((book.list_price - book.buy_price) / book.list_price) * 100)}% OFF
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Action Bar: Share | Wishlist | Add to cart */}
        <section className="border-y border-gray-200/80 py-2.5 my-1">
          <div className="grid grid-cols-3 items-center text-center divide-x divide-gray-200">
            {/* 1. Share */}
            <button
              type="button"
              id="book-ssr-share-stat-btn"
              onClick={handleShare}
              className="flex flex-col items-center justify-center px-1 py-0.5 hover:bg-gray-50/80 transition-all active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-gray-700" />
              <span className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
                Share
              </span>
            </button>

            {/* 2. Wishlist */}
            <button
              type="button"
              id="book-ssr-wishlist-stat-btn"
              onClick={handleToggleWishlist}
              className="flex flex-col items-center justify-center px-1 py-0.5 hover:bg-gray-50/80 transition-all active:scale-95 cursor-pointer"
            >
              {isWishlisted ? (
                <BookmarkCheck className="w-4 h-4 text-gray-800 fill-gray-800" />
              ) : (
                <Bookmark className="w-4 h-4 text-gray-700" />
              )}
              <span className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
                {isWishlisted ? 'Saved' : 'Wishlist'}
              </span>
            </button>

            {/* 3. Add to Cart (Base theme color) */}
            <button
              type="button"
              id="book-ssr-cart-stat-btn"
              onClick={handleAddToCart}
              className="flex flex-col items-center justify-center px-1 py-0.5 hover:bg-[#4029AB]/5 transition-all active:scale-95 cursor-pointer"
            >
              {isInCart ? (
                <Check className="w-4 h-4 text-[#4029AB]" />
              ) : (
                <ShoppingBag className="w-4 h-4 text-[#4029AB]" />
              )}
              <span className="text-[11px] font-bold text-[#4029AB] mt-0.5 whitespace-nowrap">
                {isInCart ? 'In cart' : 'Add to cart'}
              </span>
            </button>
          </div>
        </section>

        {/* Action Buttons (Sample Switcher & Buy / Read) */}
        <section className="pt-1">
          <div className="grid grid-cols-2 gap-3 items-stretch">
            {/* Left: Attention-Catching Sample Switcher with Flashing Label and Split PDF / ePub buttons */}
            <SampleSwitcher
              onOpenPdf={() => setActivePdfReaderMode('sample')}
              onOpenMd={() => setActiveMdReaderMode('sample')}
            />

            {/* Right: Full Edition (Buy Now or Read Full) */}
            <div className="flex flex-col gap-1 w-full">
              {/* Attached FULL EDITION tag text centered in small light font */}
              <div className="flex items-center justify-center px-0.5 text-center">
                <span
                  id="full-edition-label-text"
                  className="text-[10px] sm:text-[11px] font-medium text-gray-500 uppercase tracking-wider select-none text-center"
                >
                  FULL EDITION
                </span>
              </div>

              {/* Right Action Button */}
              {isPurchased ? (
                <div className="flex items-stretch rounded-md overflow-hidden border-2 border-emerald-600 shadow-xs h-10 w-full bg-emerald-600 p-[2px]">
                  <button
                    id="book-page-read-pdf-btn"
                    onClick={() => setActivePdfReaderMode('full')}
                    className="flex-1 rounded-l-[4px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1 transition-all cursor-pointer px-2 border-r border-white/25 select-none"
                    title="Read Complete eBook in PDF format"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-white" />
                    <span>Full PDF</span>
                  </button>
                  <button
                    id="book-page-read-md-btn"
                    onClick={() => setActiveMdReaderMode('full')}
                    className="flex-1 rounded-r-[4px] bg-[#FFFFFF] hover:bg-[#d9e802] active:scale-95 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1 transition-all cursor-pointer px-2 select-none"
                    title="Read Complete eBook in Mobile format"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-slate-950" />
                    <span>Full mobile</span>
                  </button>
                </div>
              ) : (
                <button
                  id="book-page-buy-now-btn"
                  onMouseEnter={() => loadRazorpayScript()}
                  onTouchStart={() => loadRazorpayScript()}
                  onClick={handleBuyNow}
                  className="w-full h-10 rounded-md bg-white hover:bg-[#4029AB]/5 text-[#4029AB] border-2 border-[#4029AB] text-xs sm:text-sm font-black transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4 text-[#4029AB]" />
                  <span>Buy (₹{book.buy_price})</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Animated Orange Notice + App Install Banner */}
        <div className="pt-0.5 space-y-1.5">
          <p
            id="book-ssr-my-books-notice"
            onClick={() => handleTabChange('purchased')}
            className="text-xs sm:text-[13px] font-bold text-orange-600 leading-snug cursor-pointer select-none animate-pulse hover:underline"
          >
            Read/Access your purchased books in the &quot;My Books&quot; menu.
          </p>

          <InstallAppBanner
            onInstall={promptInstall}
            isInstallable={isInstallable}
            className="!px-0 !pt-0 !pb-0"
          />
          {/* Permanent iOS Installation Banner */}
          <IOSHomeInstallBanner className="!px-0 !pt-0 !pb-0" />
        </div>

        {/* Book Overview & Highlights */}
        <section className="space-y-3.5 pt-2">
          <h2 className="text-base sm:text-lg font-bold text-gray-950">
            About this book
          </h2>
          <div className="space-y-3.5 text-xs sm:text-sm leading-relaxed">
            {/* 1. Clean Summary without raw markdown symbols */}
            {cleanSummaryText && (
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Summary
                </span>
                <p className="font-semibold text-gray-900 text-xs sm:text-sm leading-relaxed">
                  {cleanSummaryText}
                </p>
              </div>
            )}

            {/* 2. fullDescription: markdown field rendered into proper semantic HTML (<strong>, <ul>, etc.) */}
            {(book.fullDescription || book.full_description) ? (
              <div className="text-gray-700 leading-relaxed text-xs sm:text-sm">
                <div className="markdown-body">
                  <Markdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      p: ({ children }) => <p className="mb-2 leading-relaxed text-gray-700 last:mb-0">{children}</p>,
                      h1: ({ children }) => <h2 className="text-sm sm:text-base font-bold text-gray-950 mt-3 mb-1.5">{children}</h2>,
                      h2: ({ children }) => <h2 className="text-xs sm:text-sm font-bold text-gray-950 mt-2.5 mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xs font-bold text-gray-900 mt-2 mb-1">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2 text-gray-700">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2 text-gray-700">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-bold text-gray-950">{children}</strong>,
                      em: ({ children }) => <em className="italic text-gray-800">{children}</em>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-[#4029AB] pl-3 italic text-gray-600 my-2">
                          {children}
                        </blockquote>
                      ),
                      pre: MarkdownCodeBlock,
                      code: MarkdownCodeElement,
                      a: ({ href, children }) => (
                        <a href={href} className="text-[#4029AB] underline font-medium hover:text-[#34208e]">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {(book.fullDescription || book.full_description || '')
                      .replace(/\\n/g, '\n')
                      .replace(/\n+#{1,4}\s*(?:Frequently Asked Questions|FAQs?)\b[\s\S]*$/i, '')}
                  </Markdown>
                </div>
              </div>
            ) : (
              !cleanSummaryText && (
                <p className="text-gray-500 italic text-xs">
                  No detailed description provided for this title.
                </p>
              )
            )}

            {/* 3. Genuine Book Specifications (Only real fields from the book record) */}
            <div className="pt-2">
              <h3 className="text-xs sm:text-sm font-bold text-gray-950 mb-2">
                Book Details
              </h3>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <dl className="divide-y divide-gray-100 text-xs">
                  {book.category && (
                    <div className="grid grid-cols-3 px-3.5 py-2 bg-gray-50/60">
                      <dt className="font-semibold text-gray-500">Category</dt>
                      <dd className="col-span-2 font-bold text-gray-900">{book.category}</dd>
                    </div>
                  )}
                  <div className="grid grid-cols-3 px-3.5 py-2">
                    <dt className="font-semibold text-gray-500">Title</dt>
                    <dd className="col-span-2 font-medium text-gray-900">{book.title}</dd>
                  </div>
                  {book.language && (
                    <div className="grid grid-cols-3 px-3.5 py-2 bg-gray-50/60">
                      <dt className="font-semibold text-gray-500">Language</dt>
                      <dd className="col-span-2 font-medium text-gray-900">{book.language}</dd>
                    </div>
                  )}
                  {book.type && (
                    <div className="grid grid-cols-3 px-3.5 py-2">
                      <dt className="font-semibold text-gray-500">Format</dt>
                      <dd className="col-span-2 font-medium text-gray-900">{book.type}</dd>
                    </div>
                  )}
                  {book.pages && book.pages > 0 ? (
                    <div className="grid grid-cols-3 px-3.5 py-2 bg-gray-50/60">
                      <dt className="font-semibold text-gray-500">Pages</dt>
                      <dd className="col-span-2 font-medium text-gray-900">{book.pages} Pages</dd>
                    </div>
                  ) : null}
                  {book.publisher && (
                    <div className="grid grid-cols-3 px-3.5 py-2">
                      <dt className="font-semibold text-gray-500">Publisher</dt>
                      <dd className="col-span-2 font-medium text-gray-900">
                        {book.publisher} ({book.id})
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* 4. Real Extracted Chapter-by-Chapter Table of Contents (when available from book sample) */}
            {Array.isArray(book.tableOfContents) && book.tableOfContents.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs sm:text-sm font-bold text-gray-950 mb-2">
                  Chapters &amp; Syllabus Sections Covered
                </h3>
                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-800">
                  {book.tableOfContents.map((heading, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-snug">
                      <span className="font-bold text-[#4029AB] shrink-0">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span className="font-medium text-gray-800">{heading}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 5. Real Sample Questions from This Specific Paper (when available from book sample) */}
            {Array.isArray(book.sampleQuestions) && book.sampleQuestions.length > 0 && (
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-950">
                    Sample Questions from {book.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveMdReaderMode('sample')}
                    className="text-[11px] font-bold text-[#4029AB] hover:underline cursor-pointer"
                  >
                    Read Full Free Sample →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {book.sampleQuestions.map((sq, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-gray-200/90 bg-white space-y-2"
                    >
                      <p className="text-xs font-bold text-gray-900 leading-relaxed">
                        <span className="text-[#4029AB] mr-1.5">Q{idx + 1}.</span>
                        {sq.question}
                      </p>
                      {Array.isArray(sq.options) && sq.options.length > 0 && (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-gray-700 pl-1">
                          {sq.options.map((opt, oIdx) => (
                            <li key={oIdx} className="leading-snug">
                              {opt}
                            </li>
                          ))}
                        </ul>
                      )}
                      {sq.answer && (
                        <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-md inline-block">
                          {sq.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Genuine tags from the book document */}
            {displayTags.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                  Topic Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {displayTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200/80 rounded-full transition-colors cursor-default"
                    >
                      #{tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

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

      {/* Markdown / ePub Reader Modal */}
      {activeMdReaderMode && (
        <MarkdownReaderModal
          book={book}
          mode={activeMdReaderMode}
          onClose={() => setActiveMdReaderMode(null)}
          onBuyNow={(b) => {
            setActiveMdReaderMode(null);
            handleBuyNow();
          }}
          isPurchased={isPurchased}
        />
      )}

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
        onRequireLogin={(cb) => triggerDirectGoogleSignIn(cb)}
        userEmail={currentUser?.email || undefined}
        userName={currentUser?.displayName || undefined}
        onSuccessfulCheckout={(items, paymentData) => {
          executePurchaseQuickJump({
            itemsToBuy: items,
            paymentData,
            currentUser,
            router,
            onSuccessToast: (msg) => showToast(msg, 3000),
            onBeforeRedirect: () => setIsCartOpen(false),
          });
        }}
      />

      {/* iOS Install Guide Sheet */}
      <IOSInstallGuideModal
        isOpen={isIOSPromptOpen}
        onClose={closeIOSPrompt}
      />

      {/* Install Success Modal */}
      <InstallSuccessModal
        isOpen={isInstallSuccessOpen}
        onClose={closeInstallSuccess}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-950 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
        >
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Fixed Bottom Navigation Menu Bar - Book Details View */}
      <BottomNav
        activeTab="book"
        onTabChange={handleTabChange}
        cartCount={totalCartCount}
        purchasedCount={purchasedBookIds.length}
      />
    </div>
  );
};
