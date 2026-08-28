'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DedicatedSearchView } from '@/components/DedicatedSearchView';
import { BookDetailPage } from '@/components/BookDetailPage';
import { CartDrawer } from '@/components/CartDrawer';
import { BottomNav } from '@/components/BottomNav';
import { GoogleSignInModal } from '@/components/GoogleSignInModal';
import { Book, Category, CartItem } from '@/lib/types';
import { INITIAL_BOOKS, INITIAL_CATEGORIES } from '@/lib/data';
import { UserProfile } from '@/components/Header';
import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { getPurchasedBookIdsFromLocal, savePurchasedBookIds } from '@/lib/offline-storage';
import { recordUserPurchaseInFirestore, syncUserPurchases } from '@/lib/services/purchases';
import { processRazorpayPayment } from '@/lib/services/razorpay';
import { auth, signOutUser } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingActionAfterLogin, setPendingActionAfterLogin] = useState<((user: UserProfile) => void) | null>(null);

  // Load client persisted data on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedCart = localStorage.getItem('bookscircle_cart');
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) setCart(parsed);
        }
      } catch {}

      try {
        const localPurchased = getPurchasedBookIdsFromLocal();
        if (localPurchased.length > 0) setPurchasedBookIds(localPurchased);
      } catch {}

      try {
        const savedUser = localStorage.getItem('bookscircle_auth_user');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));
      } catch {}
    }, 0);

    return () => clearTimeout(timer);
  }, []);

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

  // Auth sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Google User',
          photoURL: user.photoURL,
        };
        setCurrentUser(profile);
        try {
          const synced = await syncUserPurchases(user.uid, user.email || undefined);
          setPurchasedBookIds(synced);
        } catch {}
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
    setCart((prev) => {
      const existing = prev.find((item) => item.book.id === book.id);
      if (existing) {
        return prev.map((item) => (item.book.id === book.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { book, quantity: 1 }];
    });
    showToast(`Added "${book.title.slice(0, 20)}..." to Cart`);
  };

  const executeRazorpayCheckout = async (itemsToBuy: CartItem[], userOverride?: UserProfile | null) => {
    if (itemsToBuy.length === 0) return;
    const activeUser = userOverride || currentUser;
    const userEmail = activeUser?.email || '';
    const userName = activeUser?.displayName || 'Reader';
    const totalAmount = itemsToBuy.reduce((sum, item) => sum + item.book.buy_price * item.quantity, 0);

    showToast('Opening Razorpay Gateway...');
    try {
      await processRazorpayPayment({
        amountInRupees: totalAmount,
        bookIds: itemsToBuy.map((i) => i.book.id),
        bookTitles: itemsToBuy.map((i) => i.book.title),
        userName,
        userEmail,
        onSuccess: async (paymentData) => {
          const newIds = itemsToBuy.map((i) => i.book.id);
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
            savePurchasedBookIds(newIds);
            setPurchasedBookIds((prev) => Array.from(new Set([...prev, ...newIds])));
          }
          setCart((prev) => prev.filter((item) => !newIds.includes(item.book.id)));
          showToast('Payment successful! Ebook unlocked in your library.');
          router.push('/');
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

  const cartBookIds = new Set(cart.map((i) => i.book.id));
  const totalCartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-[#4029AB] animate-spin" />
        <p className="text-xs font-bold text-gray-500">Loading BooksCircle Search...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-20">
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
          if (pendingActionAfterLogin) {
            const act = pendingActionAfterLogin;
            setPendingActionAfterLogin(null);
            setTimeout(() => act(profile), 300);
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
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-[#4029AB] animate-spin" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
