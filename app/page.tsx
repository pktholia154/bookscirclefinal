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
import { recordUserPurchaseInFirestore, syncUserPurchases } from '@/lib/services/purchases';
import { processRazorpayPayment } from '@/lib/services/razorpay';
import { auth, signInWithGoogle, signOutUser } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Check, ShoppingBag, RefreshCw, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const RAZORPAY_TEST_USER: UserProfile = {
  uid: 'razorpay_test_auditor_uid',
  email: 'reviewer.razorpay@bookscircle.org',
  displayName: 'Razorpay Test Reviewer',
  photoURL: null,
  isTestAccount: true,
};

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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(RAZORPAY_TEST_USER);
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

  // Load client persisted data after initial mount to prevent SSR hydration mismatches
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedUser = localStorage.getItem('bookscircle_test_user');
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
        const savedCart = localStorage.getItem('bookscircle_cart');
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCart(parsed);
          }
        }
      } catch (e) {
        console.warn('Cart load note:', e);
      }

      setIsClientLoaded(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Listen to Firebase Auth state for real Google Sign-In & cloud purchase sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
          photoURL: user.photoURL,
          isTestAccount: false,
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

  // Save cart to localStorage only after initial client hydration is complete
  useEffect(() => {
    if (!isClientLoaded || typeof window === 'undefined') return;
    try {
      localStorage.setItem('bookscircle_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('LocalStorage cart save failed:', e);
    }
  }, [cart, isClientLoaded]);

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

  // Switch to Razorpay Test Account
  const handleSetTestAccount = async () => {
    setCurrentUser(RAZORPAY_TEST_USER);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bookscircle_test_user', JSON.stringify(RAZORPAY_TEST_USER));
    }
    try {
      const merged = await syncUserPurchases(RAZORPAY_TEST_USER.uid, RAZORPAY_TEST_USER.email || undefined);
      setPurchasedBookIds(merged);
    } catch {}
    setToastMessage('Switched to Razorpay Test Reviewer account.');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Cart operations
  const handleAddToCart = (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.book.id === book.id);
      if (existing) {
        return prevCart.map((item) =>
          item.book.id === book.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { book, quantity: 1 }];
    });
    setToastMessage(`Added "${book.title.slice(0, 20)}..." to Cart`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleUpdateQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(bookId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.book.id === bookId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveFromCart = (bookId: string) => {
    setCart((prev) => prev.filter((item) => item.book.id !== bookId));
  };

  const handleClearCart = () => {
    setCart([]);
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

    // Clean up purchased items from active cart
    setCart((prev) => prev.filter((item) => !newPurchasedIds.includes(item.book.id)));
    setToastMessage(`Purchase successful! ${purchasedItems.length} eBook(s) unlocked in your library.`);
    startTransition(() => {
      setActiveTab('purchased');
      setIsCartOpen(false);
      setSelectedBook(null);
    });
  };

  // Central Razorpay checkout executor that supports instant auto-resume with authenticated user override
  const executeRazorpayCheckout = async (
    itemsToBuy: CartItem[],
    userOverride?: UserProfile | null
  ) => {
    if (itemsToBuy.length === 0) return;

    const activeUser = userOverride || currentUser;
    const userEmail = activeUser?.email || 'reviewer.razorpay@bookscircle.org';
    const userName = activeUser?.displayName || 'Reader';

    const totalAmount = itemsToBuy.reduce(
      (sum, item) => sum + (item.book.buy_price || 0) * item.quantity,
      0
    );
    const bookIds = itemsToBuy.map((i) => i.book.id);
    const bookTitles = itemsToBuy.map((i) => i.book.title);

    setToastMessage('Opening Razorpay Secure Gateway...');

    try {
      await processRazorpayPayment({
        amountInRupees: totalAmount,
        bookIds,
        bookTitles,
        userName,
        userEmail,
        onSuccess: (paymentData) => {
          handleSuccessfulCheckout(itemsToBuy, paymentData);
        },
        onError: (err) => {
          setToastMessage(err || 'Payment was declined or cancelled.');
          setTimeout(() => setToastMessage(null), 3500);
        },
        onDismiss: () => {
          // Payment dismissed cleanly
        },
      });
    } catch (e: any) {
      setToastMessage(e?.message || 'Unable to load payment gateway.');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Direct Buy Now handler with automatic login trigger and instant resume
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
    handleAddToCart(book);

    if (!currentUser || !currentUser.email) {
      handleRequireLogin((loggedInUser: UserProfile) => {
        executeRazorpayCheckout([buyItem], loggedInUser);
      });
    } else {
      executeRazorpayCheckout([buyItem], currentUser);
    }
  };

  // Demo unlock book for testing
  const handleUnlockDemoBook = async (bookId: string) => {
    savePurchasedBookIds([bookId]);
    setPurchasedBookIds((prev) => Array.from(new Set([...prev, bookId])));
  };

  // Compute cart counts & set for fast lookup
  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const activeEmail = currentUser?.email || 'reviewer.razorpay@bookscircle.org';
  const activeName = currentUser?.displayName || 'Razorpay Test Reviewer';

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
                      cartBookIds={cartBookIds}
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
                      cartBookIds={cartBookIds}
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
                      cartBookIds={cartBookIds}
                    />

                    {/* Standard List View: Complete Catalog */}
                    <BookListView
                      title="All Curated Study Materials & Guides"
                      books={books}
                      onSelectBook={(book) => setSelectedBook(book)}
                      onAddToCart={handleAddToCart}
                      cartBookIds={cartBookIds}
                    />

                    {/* Category Spotlight 1 */}
                    {category1Books.length > 0 && (
                      <BookListView
                        title={categories[0]?.title || 'UPSC Civil Services Materials'}
                        books={category1Books}
                        onSelectBook={(book) => setSelectedBook(book)}
                        onAddToCart={handleAddToCart}
                        cartBookIds={cartBookIds}
                      />
                    )}

                    {/* Category Spotlight 2 */}
                    {category2Books.length > 0 && (
                      <BookListView
                        title={categories[1]?.title || 'SSC & Competitive Exam Guides'}
                        books={category2Books}
                        onSelectBook={(book) => setSelectedBook(book)}
                        onAddToCart={handleAddToCart}
                        cartBookIds={cartBookIds}
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
                cartBookIds={cartBookIds}
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
                  <span className="bg-[#4029AB] text-white text-xs font-bold px-3 py-1 rounded-full">
                    {totalCartCount} items
                  </span>
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
                      {cart.map(({ book, quantity }) => (
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
                            <span className="text-[9px] font-bold text-[#4029AB] bg-[#4029AB]/10 px-1.5 py-0.2 rounded uppercase">
                              {book.category}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm text-gray-950 truncate mt-1">
                              {book.title}
                            </h4>
                            <p className="text-xs font-black text-gray-900 mt-1">₹{book.buy_price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQuantity(book.id, quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(book.id, quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Checkout Summary Box */}
                    <div className="p-5 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Subtotal</span>
                        <span className="font-bold text-gray-900">
                          ₹
                          {cart.reduce((sum, item) => sum + (item.book.buy_price || 0) * item.quantity, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Instant Digital Delivery</span>
                        <span className="font-bold text-emerald-600">Free</span>
                      </div>
                      <div className="border-t border-gray-200 pt-3 flex justify-between text-sm font-black text-gray-950">
                        <span>Total Amount</span>
                        <span>
                          ₹
                          {cart.reduce((sum, item) => sum + (item.book.buy_price || 0) * item.quantity, 0)}
                        </span>
                      </div>

                      <button
                        disabled={isCartTabCheckingOut}
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
                            <span>Sign in &amp; Pay ₹{cart.reduce((sum, item) => sum + (item.book.buy_price || 0) * item.quantity, 0)}</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Pay ₹{cart.reduce((sum, item) => sum + (item.book.buy_price || 0) * item.quantity, 0)} with Razorpay</span>
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
                onUnlockDemoBook={handleUnlockDemoBook}
                onSyncPurchases={async () => {
                  const merged = await syncUserPurchases(
                    currentUser?.uid,
                    currentUser?.email || undefined
                  );
                  setPurchasedBookIds(merged);
                }}
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
        onUpdateQuantity={handleUpdateQuantity}
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
