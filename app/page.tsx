'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import Image from 'next/image';
import { Header, UserProfile } from '@/components/Header';
import { CategoryChips } from '@/components/CategoryChips';
import { CarouselSection } from '@/components/CarouselSection';
import { BookListView } from '@/components/BookListView';
import { BookDetailPage } from '@/components/BookDetailPage';
import { CartDrawer } from '@/components/CartDrawer';
import { BottomNav, TabKey } from '@/components/BottomNav';
import { PurchasedView } from '@/components/PurchasedView';
import { CategoriesView } from '@/components/CategoriesView';
import { DedicatedSearchView } from '@/components/DedicatedSearchView';
import { ProfileView } from '@/components/ProfileView';
import { GoogleSignInModal } from '@/components/GoogleSignInModal';
import { IOSInstallGuideModal } from '@/components/IOSInstallGuideModal';
import { Footer } from '@/components/Footer';
import { Book, Category, CartItem } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { getPurchasedBookIdsFromLocal, savePurchasedBookIds } from '@/lib/offline-storage';
import { recordUserPurchaseInFirestore, syncUserPurchases, subscribeToUserPurchases } from '@/lib/services/purchases';
import { processRazorpayPayment, loadRazorpayScript } from '@/lib/services/razorpay';
import {
  getCartItemsFromLocal,
  addToCartAction,
  removeFromCartAction,
  clearCartAction,
  syncCartWithPurchases,
  calculateCartSummary,
  subscribeToCartChanges,
} from '@/lib/services/cart';
import { auth, signOutUser } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Check, ShoppingBag, RefreshCw, Lock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);
  const [loginModalConfig, setLoginModalConfig] = useState<{
    title?: string;
    subtitle?: string;
  }>({});
  const [pendingActionAfterLogin, setPendingActionAfterLogin] = useState<((user: UserProfile) => void) | null>(null);

  const [isClientLoaded, setIsClientLoaded] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCartTabCheckingOut, setIsCartTabCheckingOut] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  // PWA Install State & Handlers
  const {
    isInstallable,
    promptInstall,
    isIOSPromptOpen,
    closeIOSPrompt,
  } = usePWAInstall();

  // Load client persisted data after initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedUser = localStorage.getItem('bookscircle_auth_user');
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.warn('User load note:', e);
      }

      try {
        const localPurchased = getPurchasedBookIdsFromLocal();
        if (localPurchased.length > 0) {
          setPurchasedBookIds(localPurchased);
        }
      } catch (e) {
        console.warn('Purchased load note:', e);
      }

      try {
        const loadedCart = getCartItemsFromLocal();
        setCart(loadedCart);
      } catch (e) {
        console.warn('Cart load note:', e);
      }

      try {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const tabParam = urlParams.get('tab');
          if (tabParam && ['home', 'categories', 'purchased', 'cart', 'profile', 'search'].includes(tabParam)) {
            setActiveTab(tabParam as TabKey);
          }
        }
      } catch (e) {
        console.warn('URL tab load note:', e);
      }

      setIsClientLoaded(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Listen to cross-tab / cross-component cart synchronization events
  useEffect(() => {
    const unsubscribe = subscribeToCartChanges((updatedCart) => {
      setCart(updatedCart);
    });
    return () => unsubscribe();
  }, []);

  // Synchronize cart with purchased IDs to prevent buying already owned books
  useEffect(() => {
    if (purchasedBookIds.length > 0) {
      const timer = setTimeout(() => {
        const filtered = syncCartWithPurchases(getCartItemsFromLocal(), purchasedBookIds);
        setCart(filtered);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [purchasedBookIds]);

  // Listen to Firebase Auth state for real Google Sign-In & cloud purchase sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
          photoURL: user.photoURL,
        };
        setCurrentUser(profile);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('bookscircle_test_user');
        }
        try {
          const syncedIds = await syncUserPurchases(user.uid, user.email || undefined);
          setPurchasedBookIds(syncedIds);
        } catch (e) {
          console.warn('Initial cloud purchase sync note:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time continuous Firebase Firestore subscription for multi-device instant auto-sync
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToUserPurchases(
      currentUser.uid,
      currentUser.email || undefined,
      (syncedBookIds) => {
        setPurchasedBookIds(syncedBookIds);
      }
    );

    // Automatic background synchronization on tab focus, device wake, or network reconnection
    const handleAutoSync = async () => {
      try {
        const synced = await syncUserPurchases(currentUser.uid, currentUser.email || undefined);
        setPurchasedBookIds(synced);
      } catch (err) {
        // Non-blocking auto sync
      }
    };

    window.addEventListener('focus', handleAutoSync);
    window.addEventListener('online', handleAutoSync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleAutoSync();
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleAutoSync);
      window.removeEventListener('online', handleAutoSync);
    };
  }, [currentUser]);

  // Fetch live books & categories from Firestore
  const loadData = useCallback(async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) {
      setIsRefreshing(true);
    }
    try {
      const [fetchedBooks, fetchedCats] = await Promise.all([
        getBooksFromFirestore(),
        getCategoriesFromFirestore(),
      ]);

      if (fetchedBooks.length > 0) {
        setBooks(fetchedBooks);
      }
      if (fetchedCats.length > 0) {
        setCategories(fetchedCats);
      }
    } catch (err) {
      console.error('Failed to load Firestore data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const [fetchedBooks, fetchedCats] = await Promise.all([
          getBooksFromFirestore(),
          getCategoriesFromFirestore(),
        ]);
        if (!isMounted) return;
        if (fetchedBooks.length > 0) {
          setBooks(fetchedBooks);
        }
        if (fetchedCats.length > 0) {
          setCategories(fetchedCats);
        }
      } catch (err) {
        console.error('Failed to load Firestore data:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Require Login Handler with context & callback resume
  const handleRequireLogin = (
    callback?: (user: UserProfile) => void,
    modalConfig?: { title?: string; subtitle?: string }
  ) => {
    setLoginModalConfig({
      title: modalConfig?.title || 'Sign in to Complete Purchase',
      subtitle: modalConfig?.subtitle || 'Sign in or create an account to link and access your eBooks',
    });
    if (callback) {
      setPendingActionAfterLogin(() => callback);
    } else {
      setPendingActionAfterLogin(null);
    }
    setIsGoogleModalOpen(true);
  };

  // Standard Login Modal Handler
  const handleOpenLogin = () => {
    setLoginModalConfig({
      title: 'Login to BooksCircle',
      subtitle: 'Sign in to access your purchased library & reading bookmarks',
    });
    setPendingActionAfterLogin(null);
    setIsGoogleModalOpen(true);
  };

  const handleSelectUserProfile = async (profile: UserProfile) => {
    setCurrentUser(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookscircle_test_user', JSON.stringify(profile));
    }
    setToastMessage(`Signed in as ${profile.displayName || profile.email}`);
    setTimeout(() => setToastMessage(null), 3000);

    // Sync cloud purchases
    try {
      const mergedBookIds = await syncUserPurchases(profile.uid, profile.email || undefined);
      setPurchasedBookIds(mergedBookIds);
    } catch (e) {
      console.warn('User purchase cloud sync note:', e);
    }

    // Automatically resume pending action if present
    if (pendingActionAfterLogin) {
      const action = pendingActionAfterLogin;
      setPendingActionAfterLogin(null);
      setTimeout(() => {
        action(profile);
      }, 300);
    }
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (e) {
      console.warn('Firebase signout note:', e);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bookscircle_test_user');
    }
    setCurrentUser(null);
    setToastMessage('Signed out successfully.');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Centralized Cart Operations via cart.ts
  const handleAddToCart = (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (purchasedBookIds.includes(book.id)) {
      setToastMessage(`You already own "${book.title.slice(0, 22)}...". Check your Library.`);
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    const { updatedCart, isNewItem } = addToCartAction(book);
    setCart(updatedCart);

    if (isNewItem) {
      setToastMessage(`Added "${book.title.slice(0, 22)}..." to Cart`);
    } else {
      setToastMessage(`"${book.title.slice(0, 22)}..." is already in your Cart`);
    }
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleRemoveFromCart = (bookId: string) => {
    const updated = removeFromCartAction(bookId);
    setCart(updated);
  };

  const handleClearCart = () => {
    const updated = clearCartAction();
    setCart(updated);
  };

  const handleSuccessfulCheckout = async (
    purchasedItems: CartItem[],
    paymentData?: { order_id?: string; payment_id?: string; amountInRupees?: number }
  ) => {
    const newPurchasedIds = purchasedItems.map((item) => item.book.id);

    try {
      const allPurchased = await recordUserPurchaseInFirestore(
        currentUser?.uid || 'guest_user',
        currentUser?.email || 'user@bookscircle.org',
        purchasedItems,
        {
          orderId: paymentData?.order_id || `ord_${Date.now()}`,
          paymentId: paymentData?.payment_id || `pay_${Date.now()}`,
          amount: paymentData?.amountInRupees || 0,
        }
      );
      setPurchasedBookIds(allPurchased);
    } catch (e) {
      savePurchasedBookIds(newPurchasedIds);
      setPurchasedBookIds((prev) => Array.from(new Set([...prev, ...newPurchasedIds])));
    }

    // Clean up purchased items from cart
    newPurchasedIds.forEach((id) => removeFromCartAction(id));
    setCart((prev) => prev.filter((item) => !newPurchasedIds.includes(item.book.id)));

    setToastMessage(`Purchase successful! ${purchasedItems.length} eBook(s) unlocked in your library.`);
    startTransition(() => {
      setSelectedBook(null);
      setActiveTab('purchased');
      setIsCartOpen(false);
      if (typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', 'purchased');
          window.history.pushState({}, '', url.toString());
        } catch {}
      }
    });
  };

  // Central Razorpay checkout executor that supports instant auto-resume
  const executeRazorpayCheckout = async (
    itemsToBuy: CartItem[],
    userOverride?: UserProfile | null
  ) => {
    if (itemsToBuy.length === 0) return;

    const activeUser = userOverride || currentUser;
    const userEmail = activeUser?.email || '';
    const userName = activeUser?.displayName || 'Reader';
    const userId = activeUser?.uid || 'guest_user';

    const summary = calculateCartSummary(itemsToBuy);
    const totalAmount = summary.subtotal;
    const bookIds = itemsToBuy.map((i) => i.book.id);
    const bookTitles = itemsToBuy.map((i) => i.book.title);

    setIsCartTabCheckingOut(true);
    setToastMessage('Opening Razorpay Secure Gateway...');

    try {
      await processRazorpayPayment({
        amountInRupees: totalAmount,
        bookIds,
        bookTitles,
        userId,
        userName,
        userEmail,
        onSuccess: (paymentData) => {
          setIsCartTabCheckingOut(false);
          handleSuccessfulCheckout(itemsToBuy, paymentData);
        },
        onError: (err) => {
          setIsCartTabCheckingOut(false);
          setToastMessage(err || 'Payment was declined or cancelled.');
          setTimeout(() => setToastMessage(null), 3500);
        },
        onDismiss: () => {
          setIsCartTabCheckingOut(false);
        },
      });
    } catch (e: any) {
      setIsCartTabCheckingOut(false);
      setToastMessage(e?.message || 'Unable to load payment gateway.');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Direct Buy Now handler with deduplication and instant auto-resume
  const handleBuyNow = (book: Book) => {
    if (purchasedBookIds.includes(book.id)) {
      setToastMessage(`You already own "${book.title.slice(0, 20)}...". Opening Library.`);
      startTransition(() => {
        setSelectedBook(null);
        setActiveTab('purchased');
      });
      return;
    }

    const buyItem: CartItem = { book, quantity: 1 };
    
    // Ensure item is also added/synced to cart state
    const { updatedCart } = addToCartAction(book);
    setCart(updatedCart);

    if (!currentUser || !currentUser.email) {
      handleRequireLogin((loggedInUser: UserProfile) => {
        executeRazorpayCheckout([buyItem], loggedInUser);
      });
    } else {
      executeRazorpayCheckout([buyItem], currentUser);
    }
  };

  // Compute cart counts & set for fast lookup
  const totalCartCount = useMemo(() => {
    return cart.length;
  }, [cart]);

  const cartBookIds = useMemo(() => {
    return new Set(cart.map((item) => item.book.id));
  }, [cart]);

  // Filter books based on search & active category for Home Page
  const filteredBooks = useMemo(() => {
    let result = books;

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(
        (b) => b.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search query
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
  }, [books, selectedCategory, searchQuery]);

  // Curated collections for Horizontal Carousel Sections
  const featuredTrendingBooks = useMemo(() => {
    return books.filter((b) => (b.rating && b.rating >= 4.6) || (b.tags && b.tags.includes('featured')));
  }, [books]);

  const newReleasesBooks = useMemo(() => {
    return books.filter((b) => (b.rating && b.rating >= 4.7) || (b.tags && b.tags.includes('bestseller')));
  }, [books]);

  const category1Books = useMemo(() => {
    const catName = categories[0]?.title || 'UPSC Civil Services';
    return books.filter((b) => b.category.toLowerCase() === catName.toLowerCase());
  }, [books, categories]);

  const category2Books = useMemo(() => {
    const catName = categories[1]?.title || 'SSC & Govt Exams';
    return books.filter((b) => b.category.toLowerCase() === catName.toLowerCase());
  }, [books, categories]);

  // Switch tab with smooth scroll
  const handleTabChange = (tab: TabKey) => {
    startTransition(() => {
      setSelectedBook(null);
      setActiveTab(tab);
      if (tab === 'cart') {
        setIsCartOpen(true);
      }
      if (typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          if (tab === 'home') {
            url.searchParams.delete('tab');
          } else {
            url.searchParams.set('tab', tab);
          }
          window.history.pushState({}, '', url.toString());
        } catch {}
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const activeEmail = currentUser?.email || '';
  const activeName = currentUser?.displayName || 'Reader';

  const cartSummary = calculateCartSummary(cart);

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 selection:bg-[#4029AB] selection:text-white">
      {/* 1. Header with Search, Login, Cart and PWA Install (ONLY ON HOME PAGE) */}
      {activeTab === 'home' && !selectedBook && (
        <Header
          cartCount={totalCartCount}
          onOpenCart={() => setIsCartOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setActiveTab('search');
          }}
          currentUser={currentUser}
          onGoogleSignIn={handleOpenLogin}
          onNavigateToProfile={() => handleTabChange('profile')}
          onOpenDedicatedSearch={() => setActiveTab('search')}
          isInstallable={isInstallable}
          onInstall={promptInstall}
        />
      )}

      {/* 2. Main Content Views (Switched via BottomNav Tabs or Book Detail) */}
      <main className="w-full">
        {selectedBook ? (
          <BookDetailPage
            book={selectedBook}
            onBack={() => setSelectedBook(null)}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            isInCart={cartBookIds.has(selectedBook.id)}
            isPurchased={purchasedBookIds.includes(selectedBook.id)}
            onSelectRelatedBook={(relBook) => setSelectedBook(relBook)}
          />
        ) : (
          <>
            {/* TAB: DEDICATED SEARCH PAGE */}
            {activeTab === 'search' && (
              <DedicatedSearchView
                books={books}
                categories={categories}
                initialQuery={searchQuery}
                onBack={() => {
                  setSearchQuery('');
                  setActiveTab('home');
                }}
                onSelectBook={(book) => setSelectedBook(book)}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                cartBookIds={cartBookIds}
                purchasedBookIds={purchasedBookIds}
              />
            )}

            {/* TAB 1: HOME PAGE */}
            {activeTab === 'home' && (
              <>
                {/* Flexible Category Chips */}
                <CategoryChips
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={(cat) => setSelectedCategory(cat)}
                />

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <RefreshCw className="w-8 h-8 text-[#4029AB] animate-spin" />
                    <p className="text-xs font-bold text-gray-500">
                      Loading curated exam e-books from BooksCircle...
                    </p>
                  </div>
                ) : searchQuery.trim() ? (
                  /* Search Results */
                  <div className="pt-2">
                    <BookListView
                      title={`Search Results (${filteredBooks.length})`}
                      books={filteredBooks}
                      onSelectBook={(book) => setSelectedBook(book)}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      cartBookIds={cartBookIds}
                      purchasedBookIds={purchasedBookIds}
                    />
                  </div>
                ) : selectedCategory !== 'all' ? (
                  /* Category-Specific View */
                  <div className="pt-2">
                    <BookListView
                      title={`${selectedCategory} Books (${filteredBooks.length})`}
                      books={filteredBooks}
                      onSelectBook={(book) => setSelectedBook(book)}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      cartBookIds={cartBookIds}
                      purchasedBookIds={purchasedBookIds}
                    />
                  </div>
                ) : (
                  /* Default Full Home View with Peekaboo Carousel & Standard List */
                  <>
                    {/* Horizontal Carousel 1: Trending & Top Rated */}
                    <CarouselSection
                      title="Trending & Top Rated"
                      sectionId="trending-books"
                      books={featuredTrendingBooks.length > 0 ? featuredTrendingBooks : books.slice(0, 6)}
                      onSelectBook={(book) => setSelectedBook(book)}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      cartBookIds={cartBookIds}
                      purchasedBookIds={purchasedBookIds}
                    />

                    {/* Standard List View: Complete Catalog */}
                    <BookListView
                      title="All Curated Study Materials & Guides"
                      books={books}
                      onSelectBook={(book) => setSelectedBook(book)}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      cartBookIds={cartBookIds}
                      purchasedBookIds={purchasedBookIds}
                    />

                    {/* Category Spotlight 1 */}
                    {category1Books.length > 0 && (
                      <BookListView
                        title={categories[0]?.title || 'UPSC Civil Services Materials'}
                        books={category1Books}
                        onSelectBook={(book) => setSelectedBook(book)}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                        cartBookIds={cartBookIds}
                        purchasedBookIds={purchasedBookIds}
                      />
                    )}

                    {/* Category Spotlight 2 */}
                    {category2Books.length > 0 && (
                      <BookListView
                        title={categories[1]?.title || 'SSC & Competitive Exam Guides'}
                        books={category2Books}
                        onSelectBook={(book) => setSelectedBook(book)}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                        cartBookIds={cartBookIds}
                        purchasedBookIds={purchasedBookIds}
                      />
                    )}
                  </>
                )}

                {/* Bottom of Home Page: Official Razorpay Compliance & Policy Footer */}
                <Footer onNavigateToTab={handleTabChange} />
              </>
            )}

            {/* TAB 2: CATEGORIES PAGE */}
            {activeTab === 'categories' && (
              <CategoriesView
                categories={categories}
                books={books}
                onSelectBook={(book) => setSelectedBook(book)}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                cartBookIds={cartBookIds}
                purchasedBookIds={purchasedBookIds}
              />
            )}

            {/* TAB 3: CART PAGE / TAB */}
            {activeTab === 'cart' && (
              <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto space-y-6">
                <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-950">Shopping Cart</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Review selected e-books before secure digital checkout.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cart.length > 0 && (
                      <button
                        onClick={handleClearCart}
                        className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors px-2 py-1 cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                    <span className="bg-[#4029AB] text-white text-xs font-bold px-3 py-1 rounded-full">
                      {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="py-16 text-center bg-gray-50 rounded-3xl border border-gray-200/80 space-y-4">
                    <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Your cart is empty</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                        Explore competitive exam e-books and study material to add to your library.
                      </p>
                    </div>
                    <button
                      onClick={() => handleTabChange('home')}
                      className="px-5 py-2.5 bg-[#4029AB] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#34208e] cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Browse Catalog</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {cart.map(({ book }) => (
                        <div
                          key={book.id}
                          className="p-4 rounded-2xl border border-gray-200 bg-white flex items-center gap-3.5"
                        >
                          <div className="relative w-14 aspect-[3/4] rounded-none overflow-hidden shrink-0 bg-gray-100 border border-gray-200 shadow-2xs">
                            <Image
                              src={book.cover || DEFAULT_BOOK_COVER}
                              alt={book.title}
                              fill
                              unoptimized
                              sizes="56px"
                              className="object-cover rounded-none"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold text-[#4029AB] bg-[#4029AB]/10 px-1.5 py-0.5 rounded uppercase">
                              {book.category}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm text-gray-950 truncate mt-1">
                              {book.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-black text-gray-950">₹{book.buy_price}</span>
                              {book.list_price && book.list_price > book.buy_price && (
                                <span className="text-xs text-gray-400 line-through">₹{book.list_price}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFromCart(book.id)}
                            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all cursor-pointer"
                            title="Remove from Cart"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Checkout Summary Box */}
                    <div className="p-5 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Subtotal ({cart.length} {cart.length === 1 ? 'eBook' : 'eBooks'})</span>
                        <span className="font-bold text-gray-900">
                          ₹{cartSummary.subtotal}
                        </span>
                      </div>
                      {cartSummary.savings > 0 && (
                        <div className="flex justify-between text-xs text-emerald-600">
                          <span>Total Savings ({cartSummary.savingsPercent}% OFF)</span>
                          <span className="font-semibold">-₹{cartSummary.savings}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Instant Digital Delivery</span>
                        <span className="font-bold text-emerald-600">Free</span>
                      </div>
                      <div className="border-t border-gray-200 pt-3 flex justify-between text-sm font-black text-gray-950">
                        <span>Total Amount</span>
                        <span className="text-base text-[#4029AB]">
                          ₹{cartSummary.subtotal}
                        </span>
                      </div>

                      <button
                        disabled={isCartTabCheckingOut}
                        onMouseEnter={() => loadRazorpayScript()}
                        onTouchStart={() => loadRazorpayScript()}
                        onClick={async () => {
                          if (cart.length === 0) return;
                          if (!currentUser || !currentUser.email) {
                            handleRequireLogin((loggedInUser: UserProfile) => {
                              executeRazorpayCheckout(cart, loggedInUser);
                            });
                            return;
                          }
                          executeRazorpayCheckout(cart, currentUser);
                        }}
                        id="cart-tab-checkout-btn"
                        className="w-full py-3 bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70"
                      >
                        {isCartTabCheckingOut ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Opening Razorpay Gateway...</span>
                          </span>
                        ) : !currentUser || !currentUser.email ? (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Sign in &amp; Pay ₹{cartSummary.subtotal}</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Pay ₹{cartSummary.subtotal} with Razorpay</span>
                          </>
                        )}
                      </button>

                      <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1.5 pt-1">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span>Secured by Razorpay • Instant Digital Activation</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PURCHASED PAGE */}
            {activeTab === 'purchased' && (
              <PurchasedView
                books={books}
                purchasedBookIds={purchasedBookIds}
                currentUser={currentUser}
                onSelectBook={(book) => setSelectedBook(book)}
                onNavigateHome={() => handleTabChange('home')}
              />
            )}

            {/* TAB 5: PROFILE PAGE */}
            {activeTab === 'profile' && (
              <ProfileView
                currentUser={currentUser}
                purchasedCount={purchasedBookIds.length}
                onNavigateToPurchased={() => handleTabChange('purchased')}
                onGoogleSignIn={handleOpenLogin}
                onSignOut={handleSignOut}
              />
            )}
          </>
        )}
      </main>

      {/* Slide-over Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onSuccessfulCheckout={handleSuccessfulCheckout}
        currentUser={currentUser}
        onRequireLogin={handleRequireLogin}
        userEmail={activeEmail}
        userName={activeName}
      />

      {/* Dual Login Authentication Modal */}
      <GoogleSignInModal
        isOpen={isGoogleModalOpen}
        onClose={() => {
          setIsGoogleModalOpen(false);
          setPendingActionAfterLogin(null);
        }}
        onSelectUser={handleSelectUserProfile}
        title={loginModalConfig.title}
        subtitle={loginModalConfig.subtitle}
      />

      {/* iOS Add to Home Screen Instructions Modal */}
      <IOSInstallGuideModal
        isOpen={isIOSPromptOpen}
        onClose={closeIOSPrompt}
      />

      {/* Fixed High Density Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        cartCount={totalCartCount}
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
}
