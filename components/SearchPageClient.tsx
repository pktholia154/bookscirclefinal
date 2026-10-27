'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DedicatedSearchView } from '@/components/DedicatedSearchView';
import { BookDetailPage } from '@/components/BookDetailPage';
import { CartDrawer } from '@/components/CartDrawer';
import { BottomNav, TabKey } from '@/components/BottomNav';
import { GoogleSignInModal } from '@/components/GoogleSignInModal';
import { Book, Category, CartItem } from '@/lib/types';
import { INITIAL_BOOKS, INITIAL_CATEGORIES, FREE_SAMPLE_BOOK_ID } from '@/lib/data';
import { UserProfile } from '@/components/Header';
import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { getPurchasedBookIdsFromLocal, savePurchasedBookIds } from '@/lib/offline-storage';
import { recordUserPurchaseInFirestore, syncUserPurchases } from '@/lib/services/purchases';
import { processRazorpayPayment } from '@/lib/services/razorpay';
import {
  getCachedAuthUserSync,
  persistAndBroadcastAuthUser,
  subscribeToUnifiedAuthState,
} from '@/lib/firebase';
import {
  executePurchaseQuickJump,
  subscribeToPurchasesUpdated,
  setTargetHomeTab,
} from '@/lib/services/quick-jump';
import { getCartFromLocal, addToCartAction, subscribeToCartChanges } from '@/lib/services/cart';
import { RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchPageProps {
  initialBooks?: Book[];
  initialCategories?: Category[];
}

function SearchPageContent({
  initialBooks = INITIAL_BOOKS,
  initialCategories = INITIAL_CATEGORIES,
}: SearchPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';

  const [books, setBooks] = useState<Book[]>(
    initialBooks && initialBooks.length > 0 ? initialBooks : INITIAL_BOOKS
  );
  const [categories, setCategories] = useState<Category[]>(
    initialCategories && initialCategories.length > 0 ? initialCategories : INITIAL_CATEGORIES
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>([FREE_SAMPLE_BOOK_ID]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingActionAfterLogin, setPendingActionAfterLogin] = useState<((user: UserProfile) => void) | null>(null);

  // Load client persisted data on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setCart(getCartFromLocal());
      } catch {}

      try {
        const localPurchased = getPurchasedBookIdsFromLocal();
        if (localPurchased.length > 0) setPurchasedBookIds(localPurchased);
      } catch {}

      try {
        const cachedUser = getCachedAuthUserSync();
        if (cachedUser) setCurrentUser(cachedUser);
      } catch {}
    }, 0);

    router.prefetch('/');
    router.prefetch('/purchased');

    const unsubCart = subscribeToCartChanges((updated) => setCart(updated));
    const unsubPurchases = subscribeToPurchasesUpdated((newIds) => {
      setPurchasedBookIds((prev) => Array.from(new Set([...prev, ...newIds])));
    });

    const handlePurchasesUpdatedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (Array.isArray(customEvent.detail)) {
        setPurchasedBookIds((prev) => Array.from(new Set([...prev, ...customEvent.detail])));
      } else {
        setPurchasedBookIds(getPurchasedBookIdsFromLocal());
      }
    };
    window.addEventListener('bookscircle:purchases-updated', handlePurchasesUpdatedEvent);

    return () => {
      clearTimeout(timer);
      unsubCart();
      unsubPurchases();
      window.removeEventListener('bookscircle:purchases-updated', handlePurchasesUpdatedEvent);
    };
  }, [router]);

  // Load books & categories from Firestore
  useEffect(() => {
    async function init() {
      try {
        const [b, c] = await Promise.all([getBooksFromFirestore(), getCategoriesFromFirestore()]);
        if (b.length > 0) setBooks(b);
        if (c.length > 0) setCategories(c);
      } catch (err) {
        console.error('Failed to load books for search page:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Save cart
  useEffect(() => {
    try {
      localStorage.setItem('bookscircle_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Unified Auth sync across Web & Installed PWA
  useEffect(() => {
    const unsub = subscribeToUnifiedAuthState(async (profile) => {
      if (profile && profile.uid) {
        setCurrentUser(profile);
        try {
          const synced = await syncUserPurchases(profile.uid, profile.email || undefined);
          setPurchasedBookIds(synced);
        } catch {}
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddToCart = (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const { updatedCart, message } = addToCartAction(book);
    setCart(updatedCart);
    showToast(message);
  };

  const executeRazorpayCheckout = async (itemsToBuy: CartItem[], userOverride?: UserProfile | null) => {
    if (itemsToBuy.length === 0) return;
    const activeUser = userOverride || currentUser;
    const userEmail = activeUser?.email || '';
    const userName = activeUser?.displayName || 'Reader';
    const totalAmount = itemsToBuy.reduce((sum, item) => sum + (item?.book?.buy_price || 0) * (item?.quantity || 1), 0);

    showToast('Opening Razorpay Gateway...');
    try {
      await processRazorpayPayment({
        amountInRupees: totalAmount,
        bookIds: itemsToBuy.map((i) => i.book.id),
        bookTitles: itemsToBuy.map((i) => i.book.title),
        userName,
        userEmail,
        onSuccess: (paymentData) => {
          executePurchaseQuickJump({
            itemsToBuy,
            paymentData,
            currentUser: activeUser,
            router,
            onSuccessToast: (msg) => showToast(msg),
            onBeforeRedirect: () => setIsCartOpen(false),
          });
        },
        onError: (err) => showToast(err || 'Payment cancelled.'),
      });
    } catch {
      showToast('Could not load payment gateway.');
    }
  };

  const handleBuyNow = (book: Book) => {
    if (purchasedBookIds.includes(book.id)) {
      showToast(`You already own this book.`);
      return;
    }
    const buyItem: CartItem = { book, quantity: 1 };
    handleAddToCart(book);
    if (!currentUser || !currentUser.email) {
      setPendingActionAfterLogin(() => (user: UserProfile) => executeRazorpayCheckout([buyItem], user));
      setIsGoogleModalOpen(true);
    } else {
      executeRazorpayCheckout([buyItem], currentUser);
    }
  };

  const cartBookIds = new Set(
    (Array.isArray(cart) ? cart : [])
      .filter((i) => i && i.book && i.book.id)
      .map((i) => i.book.id)
  );
  const totalCartCount = (Array.isArray(cart) ? cart : []).reduce(
    (acc, i) => acc + (i?.quantity || 1),
    0
  );

  const handleTabChange = (tab: TabKey) => {
    if (tab === 'cart') {
      setIsCartOpen(true);
      return;
    }
    if (tab === 'purchased') {
      router.push('/purchased');
      return;
    }
    setTargetHomeTab(tab || 'home');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-[#5e17eb] animate-spin" />
        <p className="text-xs font-bold text-gray-500">Loading BooksCircle Search...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 sm:pb-28">
      {selectedBook ? (
        <BookDetailPage
          book={selectedBook}
          onBack={() => setSelectedBook(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          isInCart={cartBookIds.has(selectedBook.id)}
          isPurchased={purchasedBookIds.includes(selectedBook.id)}
          onSelectRelatedBook={(b) => setSelectedBook(b)}
        />
      ) : (
        <DedicatedSearchView
          books={books}
          categories={categories}
          initialQuery={queryParam}
          onBack={() => router.push('/')}
          onSelectBook={(b) => setSelectedBook(b)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          cartBookIds={cartBookIds}
          purchasedBookIds={purchasedBookIds}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={(id, q) =>
          setCart((prev) => (q <= 0 ? prev.filter((i) => i.book.id !== id) : prev.map((i) => (i.book.id === id ? { ...i, quantity: q } : i))))
        }
        onRemoveItem={(id) => setCart((prev) => prev.filter((i) => i.book.id !== id))}
        onClearCart={() => setCart([])}
        currentUser={currentUser}
        onRequireLogin={(onLoginCompleted) => {
          setPendingActionAfterLogin(() => onLoginCompleted);
          setIsGoogleModalOpen(true);
        }}
        onSuccessfulCheckout={(items, paymentData) => {
          executePurchaseQuickJump({
            itemsToBuy: items,
            paymentData,
            currentUser,
            router,
            onSuccessToast: (msg) => showToast(msg),
            onBeforeRedirect: () => setIsCartOpen(false),
          });
        }}
      />

      {/* Login Modal */}
      <GoogleSignInModal
        isOpen={isGoogleModalOpen}
        onClose={() => {
          setIsGoogleModalOpen(false);
          setPendingActionAfterLogin(null);
        }}
        onSelectUser={(profile) => {
          setCurrentUser(profile);
          persistAndBroadcastAuthUser(profile);
          if (pendingActionAfterLogin) {
            const act = pendingActionAfterLogin;
            setPendingActionAfterLogin(null);
            setTimeout(() => act(profile), 200);
          }
        }}
      />

      {/* Toast */}
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

      {/* Fixed High Density Bottom Navigation */}
      <BottomNav
        activeTab={selectedBook ? 'book' : 'search'}
        onTabChange={handleTabChange}
        cartCount={totalCartCount}
        purchasedCount={purchasedBookIds.length}
      />
    </div>
  );
}

export default function SearchPage(props: SearchPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-[#5e17eb] animate-spin" />
        </div>
      }
    >
      <SearchPageContent {...props} />
    </Suspense>
  );
}
