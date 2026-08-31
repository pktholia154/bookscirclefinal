'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header, UserProfile } from '@/components/Header';
import { CategoryChips } from '@/components/CategoryChips';
import { CarouselSection } from '@/components/CarouselSection';
import { BookListView } from '@/components/BookListView';
import { BookGridView } from '@/components/BookGridView';
import { HomeShimmerSkeleton } from '@/components/HomeShimmerSkeleton';
import { BookDetailPage } from '@/components/BookDetailPage';
import { CartDrawer } from '@/components/CartDrawer';
import { BottomNav, TabKey } from '@/components/BottomNav';
import { PurchasedView } from '@/components/PurchasedView';
import { CategoriesView } from '@/components/CategoriesView';
import { DedicatedSearchView } from '@/components/DedicatedSearchView';
import { ProfileView } from '@/components/ProfileView';
import { IOSInstallGuideModal } from '@/components/IOSInstallGuideModal';
import { Footer } from '@/components/Footer';
import { Book, Category, CartItem } from '@/lib/types';
import { DEFAULT_BOOK_COVER, INITIAL_BOOKS, INITIAL_CATEGORIES } from '@/lib/data';
import {
  getBooksFromFirestore,
  getCategoriesFromFirestore,
  getCachedBooksSync,
  getCachedCategoriesSync,
  subscribeToFirestoreBooks,
  subscribeToFirestoreCategories,
} from '@/lib/services/books';
import { getPurchasedBookIdsFromLocal, savePurchasedBookIds } from '@/lib/offline-storage';
import { recordUserPurchaseInFirestore, syncUserPurchases, subscribeToUserPurchases } from '@/lib/services/purchases';
import { syncUserProfileToFirestore } from '@/lib/services/users';
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
import {
  getWishlistIdsFromLocal,
  toggleWishlistAction,
  subscribeToWishlistChanges,
} from '@/lib/services/wishlist';
import { auth, signOutUser, signInWithGoogle } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Check, ShoppingBag, RefreshCw, Lock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

export default function HomePage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
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
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
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
        const localWishlist = getWishlistIdsFromLocal();
        setWishlistIds(localWishlist);
      } catch (e) {
        console.warn('Wishlist load note:', e);
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

  // Subscribe to wishlist updates
  useEffect(() => {
    const unsubscribe = subscribeToWishlistChanges((ids) => {
      setWishlistIds(ids);
    });
    return () => unsubscribe();
  }, []);

  const wishlistBookIds = useMemo(() => new Set(wishlistIds), [wishlistIds]);

  const handleToggleWishlist = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    const { isWishlisted, wishlistIds: updated } = toggleWishlistAction(book);
    setWishlistIds(updated);
    showToast(
      isWishlisted
        ? `Added "${book.title.slice(0, 20)}..." to Wishlist`
        : `Removed from Wishlist`,
      2000
    );
  };

  // Stabilize refs to avoid cyclical re-renders and re-subscribing auth listeners
  const currentUserRef = useRef<UserProfile | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

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
        const currentCart = getCartItemsFromLocal();
        const filtered = syncCartWithPurchases(currentCart, purchasedBookIds);
        if (filtered.length !== currentCart.length) {
          setCart(filtered);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [purchasedBookIds]);

  // Toast message helper with automatic clearing timer
  const showToast = useCallback((msg: string | null, duration = 3000) => {
    if (!msg) {
      setToastMessage(null);
      return;
    }
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, duration);
  }, []);

  const handleSuccessfulCheckout = useCallback(
    async (
      purchasedItems: CartItem[],
      paymentData?: { order_id?: string; payment_id?: string; amountInRupees?: number },
      userOverride?: UserProfile | null
    ) => {
      const newPurchasedIds = purchasedItems.map((item) => item.book.id);
      const activeUser = userOverride || currentUserRef.current;
      const effectiveUserId = activeUser?.uid || auth?.currentUser?.uid || 'guest_user';
      const effectiveUserEmail = activeUser?.email || auth?.currentUser?.email || 'user@bookscircle.org';

      // 1. Instant local state update & persistence
      savePurchasedBookIds(newPurchasedIds);
      setPurchasedBookIds((prev) => {
        const next = Array.from(new Set([...prev, ...newPurchasedIds]));
        if (next.length === prev.length) return prev;
        return next;
      });

      // 2. Perform Firestore cloud purchase record asynchronously in background without blocking UI
      recordUserPurchaseInFirestore(
        effectiveUserId,
        effectiveUserEmail,
        purchasedItems,
        {
          orderId: paymentData?.order_id || `ord_${Date.now()}`,
          paymentId: paymentData?.payment_id || `pay_${Date.now()}`,
          amount: paymentData?.amountInRupees || 0,
        }
      )
        .then((allPurchased) => {
          if (allPurchased && allPurchased.length > 0) {
            setPurchasedBookIds((prev) => {
              const unique = Array.from(new Set([...prev, ...allPurchased]));
              if (unique.length === prev.length) return prev;
              return unique;
            });
          }
        })
        .catch((e) => {
          console.warn('Purchase cloud record note:', e);
        });

      // Clean up purchased items from cart
      newPurchasedIds.forEach((id) => removeFromCartAction(id));
      setCart((prev) => prev.filter((item) => !newPurchasedIds.includes(item.book.id)));

      showToast(`Purchase successful! ${purchasedItems.length} eBook(s) unlocked in your library.`, 3500);

      // 3. Immediate redirect & tab switch to purchased library view
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
    },
    [showToast]
  );

  // Central Razorpay checkout executor that supports instant auto-resume
  const executeRazorpayCheckout = useCallback(
    async (
      itemsToBuy: CartItem[],
      userOverride?: UserProfile | null
    ) => {
      if (itemsToBuy.length === 0) return;

      const activeUser = userOverride || currentUserRef.current;
      const userEmail = activeUser?.email || '';
      const userName = activeUser?.displayName || 'Reader';
      const userId = activeUser?.uid || 'guest_user';

      const summary = calculateCartSummary(itemsToBuy);
      const totalAmount = summary.subtotal;
      const bookIds = itemsToBuy.map((i) => i.book.id);
      const bookTitles = itemsToBuy.map((i) => i.book.title);

      setIsCartTabCheckingOut(true);
      showToast('Opening Razorpay Secure Gateway...', 2500);

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
            handleSuccessfulCheckout(itemsToBuy, paymentData, activeUser);
          },
          onError: (err) => {
            setIsCartTabCheckingOut(false);
            showToast(err || 'Payment was declined or cancelled.', 3500);
          },
          onDismiss: () => {
            setIsCartTabCheckingOut(false);
          },
        });
      } catch (e: any) {
        setIsCartTabCheckingOut(false);
        showToast(e?.message || 'Unable to load payment gateway.', 3500);
      }
    },
    [handleSuccessfulCheckout, showToast]
  );

  const executeRazorpayCheckoutRef = useRef(executeRazorpayCheckout);
  useEffect(() => {
    executeRazorpayCheckoutRef.current = executeRazorpayCheckout;
  }, [executeRazorpayCheckout]);

  const pendingActionAfterLoginRef = useRef(pendingActionAfterLogin);
  useEffect(() => {
    pendingActionAfterLoginRef.current = pendingActionAfterLogin;
  }, [pendingActionAfterLogin]);

  // Auto-resume pending purchase pipeline after sign in without requiring user to click buy again
  const autoResumePendingCheckout = useCallback(
    (user: UserProfile) => {
      const pendingItems = getPendingCheckoutItems();
      if (pendingItems && pendingItems.length > 0) {
        showToast('Sign in complete! Opening payment gateway...', 2500);
        setTimeout(() => {
          executeRazorpayCheckoutRef.current(pendingItems, user);
        }, 350);
        return true;
      }
      return false;
    },
    [showToast]
  );

  // Listen to Firebase Auth state for real Google Sign-In & cloud purchase sync (Mounted ONCE)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
          photoURL: user.photoURL,
        };

        // Guard against state reference churn
        setCurrentUser((prev) => {
          if (
            prev &&
            prev.uid === profile.uid &&
            prev.email === profile.email &&
            prev.displayName === profile.displayName &&
            prev.photoURL === profile.photoURL
          ) {
            return prev;
          }
          return profile;
        });

        if (typeof window !== 'undefined') {
          localStorage.removeItem('bookscircle_user_session');
        }

        // Non-blocking background sync of user profile document to Firestore /users/{uid}
        syncUserProfileToFirestore({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          providerId: user.providerData?.[0]?.providerId || 'google.com',
        }).catch((err) => console.warn('User profile sync on auth state change note:', err));

        // Non-blocking sync of cloud purchases
        syncUserPurchases(user.uid, user.email || undefined)
          .then((syncedIds) => {
            if (syncedIds && syncedIds.length > 0) {
              setPurchasedBookIds((prev) => {
                const unique = Array.from(new Set([...prev, ...syncedIds]));
                if (unique.length === prev.length) return prev;
                return unique;
              });
            }
          })
          .catch((e) => console.warn('Initial cloud purchase sync note:', e));

        // Auto-resume pending purchase if visitor clicked buy before signing in
        const pendingItems = getPendingCheckoutItems();
        if (pendingItems && pendingItems.length > 0) {
          showToast('Sign in complete! Opening payment gateway...', 2500);
          setTimeout(() => {
            executeRazorpayCheckoutRef.current(pendingItems, profile);
          }, 350);
        } else if (pendingActionAfterLoginRef.current) {
          const action = pendingActionAfterLoginRef.current;
          setPendingActionAfterLogin(null);
          setTimeout(() => {
            action(profile);
          }, 150);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, [showToast]);

  // Real-time continuous Firebase Firestore subscription for multi-device instant auto-sync
  useEffect(() => {
    const currentUid = currentUser?.uid;
    const currentEmail = currentUser?.email || undefined;
    if (!currentUid) return;

    const unsubscribe = subscribeToUserPurchases(
      currentUid,
      currentEmail,
      (syncedBookIds) => {
        setPurchasedBookIds((prev) => {
          if (
            prev.length === syncedBookIds.length &&
            prev.every((id, idx) => id === syncedBookIds[idx])
          ) {
            return prev;
          }
          return syncedBookIds;
        });
      }
    );

    let lastAutoSyncTime = 0;
    // Throttled automatic background synchronization on tab focus, device wake, or network reconnection
    const handleAutoSync = () => {
      const now = Date.now();
      if (now - lastAutoSyncTime < 15000) return; // at most once every 15s
      lastAutoSyncTime = now;

      syncUserPurchases(currentUid, currentEmail)
        .then((synced) => {
          if (synced && synced.length > 0) {
            setPurchasedBookIds((prev) => {
              const unique = Array.from(new Set([...prev, ...synced]));
              if (unique.length === prev.length) return prev;
              return unique;
            });
          }
        })
        .catch(() => {});
    };

    window.addEventListener('focus', handleAutoSync);
    window.addEventListener('online', handleAutoSync);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleAutoSync);
      window.removeEventListener('online', handleAutoSync);
    };
  }, [currentUser?.uid, currentUser?.email]);

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
        if (fetchedBooks && fetchedBooks.length > 0) {
          setBooks(fetchedBooks);
        }
        if (fetchedCats && fetchedCats.length > 0) {
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

    // Attach real-time snapshot listeners to 'bookscircle' database for background sync
    const unsubBooks = subscribeToFirestoreBooks((updatedBooks) => {
      if (isMounted && updatedBooks && updatedBooks.length > 0) {
        setBooks(updatedBooks);
      }
    });

    const unsubCats = subscribeToFirestoreCategories((updatedCats) => {
      if (isMounted && updatedCats && updatedCats.length > 0) {
        setCategories(updatedCats);
      }
    });

    return () => {
      isMounted = false;
      unsubBooks();
      unsubCats();
    };
  }, []);

  // Direct Google Sign-In trigger (No modal popup dialog)
  const triggerDirectGoogleSignIn = async (callback?: (user: UserProfile) => void) => {
    try {
      showToast('Initiating Google sign in...', 2500);
      const res = await signInWithGoogle();
      if (res.user) {
        const profile: UserProfile = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || (res.user.email ? res.user.email.split('@')[0] : 'Google User'),
          photoURL: res.user.photoURL,
        };
        await handleSelectUserProfile(profile);
        if (callback) {
          callback(profile);
        }
      } else if (res.fallbackNeeded) {
        showToast('Firebase Google Sign-In domain check in progress. Please retry.', 3500);
      } else if (res.cancelled) {
        showToast('Google sign in was cancelled.', 2500);
      }
    } catch (err: any) {
      if (!err?.message?.includes('popup-closed-by-user')) {
        showToast('Google sign in error: ' + (err?.message || 'Failed'), 3500);
      }
    }
  };

  // Require Login Handler with direct Google sign in execution
  const handleRequireLogin = (
    callback?: (user: UserProfile) => void
  ) => {
    triggerDirectGoogleSignIn(callback);
  };

  // Standard Direct Login Handler
  const handleOpenLogin = () => {
    triggerDirectGoogleSignIn();
  };

  const handleSelectUserProfile = async (profile: UserProfile) => {
    setCurrentUser((prev) => {
      if (
        prev &&
        prev.uid === profile.uid &&
        prev.email === profile.email &&
        prev.displayName === profile.displayName &&
        prev.photoURL === profile.photoURL
      ) {
        return prev;
      }
      return profile;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('bookscircle_user_session', JSON.stringify(profile));
    }
    showToast(`Signed in as ${profile.displayName || profile.email}`, 3000);

    // Non-blocking user profile document sync
    syncUserProfileToFirestore({
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      providerId: 'google.com',
    }).catch((err) => console.warn('User profile sync in handleSelectUserProfile note:', err));

    // Non-blocking cloud purchase sync
    syncUserPurchases(profile.uid, profile.email || undefined)
      .then((mergedBookIds) => {
        if (mergedBookIds && mergedBookIds.length > 0) {
          setPurchasedBookIds((prev) => {
            const unique = Array.from(new Set([...prev, ...mergedBookIds]));
            if (unique.length === prev.length) return prev;
            return unique;
          });
        }
      })
      .catch((e) => console.warn('User purchase cloud sync note:', e));

    // Auto-resume pending checkout if stored in session
    const resumed = autoResumePendingCheckout(profile);

    // Automatically resume pending callback action if present and not already resumed
    if (!resumed && pendingActionAfterLogin) {
      const action = pendingActionAfterLogin;
      setPendingActionAfterLogin(null);
      setTimeout(() => {
        action(profile);
      }, 150);
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
      localStorage.removeItem('bookscircle_user_session');
    }
    setCurrentUser(null);
    showToast('Signed out successfully.', 2500);
  };

  // Centralized Cart Operations via cart.ts
  const handleAddToCart = (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (purchasedBookIds.includes(book.id)) {
      showToast(`You already own "${book.title.slice(0, 22)}...". Check your Library.`, 2500);
      return;
    }

    const { updatedCart, isNewItem } = addToCartAction(book);
    setCart(updatedCart);

    if (isNewItem) {
      showToast(`Added "${book.title.slice(0, 22)}..." to Cart`, 2500);
    } else {
      showToast(`"${book.title.slice(0, 22)}..." is already in your Cart`, 2500);
    }
  };

  const handleRemoveFromCart = (bookId: string) => {
    const updated = removeFromCartAction(bookId);
    setCart(updated);
  };

  const handleClearCart = () => {
    const updated = clearCartAction();
    setCart(updated);
  };

  // Direct Buy Now handler - initiates direct checkout without adding to user's cart
  const handleBuyNow = (book: Book) => {
    if (purchasedBookIds.includes(book.id)) {
      showToast(`You already own "${book.title.slice(0, 20)}...". Opening Library.`, 3000);
      startTransition(() => {
        setSelectedBook(null);
        setActiveTab('purchased');
      });
      return;
    }

    const buyItem: CartItem = { book, quantity: 1 };

    if (!currentUser || !currentUser.email) {
      // Save pending checkout in session storage AND state callback to guarantee seamless auto-resume
      savePendingCheckoutSession([buyItem]);
      setPendingActionAfterLogin(() => (loggedInUser: UserProfile) => {
        executeRazorpayCheckout([buyItem], loggedInUser);
      });
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
      const target = selectedCategory.toLowerCase().trim();
      result = result.filter((b) => {
        const cat = (b.category || '').toLowerCase();
        const slug = (b.categorySlug || '').toLowerCase();
        return cat === target || slug === target || target.includes(slug) || slug.includes(target) || target.includes(cat) || cat.includes(target);
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          (b.categorySlug && b.categorySlug.toLowerCase().includes(q)) ||
          (b.seoDescription && b.seoDescription.toLowerCase().includes(q)) ||
          (b.topics && b.topics.some((t) => t.toLowerCase().includes(q))) ||
          b.author?.toLowerCase().includes(q) ||
          b.publisher?.toLowerCase().includes(q) ||
          b.language?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [books, selectedCategory, searchQuery]);

  // Curated collections for Horizontal Carousel Sections
  const featuredTrendingBooks = useMemo(() => {
    const featured = books.filter((b) => (b.rating && b.rating >= 4.6) || (b.tags && b.tags.includes('featured')));
    return featured.length > 0 ? featured : books.slice(0, 10);
  }, [books]);

  const bestSellerBooks = useMemo(() => {
    const best = books.filter(
      (b) =>
        b.is_bestseller ||
        b.badge === 'Bestseller' ||
        (b.tags && b.tags.includes('bestseller')) ||
        (b.rating_count && b.rating_count >= 200) ||
        (b.rating && b.rating >= 4.7)
    );
    return best.length > 0 ? best : books.slice(0, 8);
  }, [books]);

  // Top 3 categories with highest number of books
  const topCategoriesWithBooks = useMemo(() => {
    const counts: Record<string, { category: Category; books: Book[] }> = {};

    categories.forEach((cat) => {
      const target = (cat.title || '').toLowerCase();
      const slug = (cat.seolsug || cat.id).toLowerCase();
      const matched = books.filter((b) => {
        const bCat = (b.category || '').toLowerCase();
        const bSlug = (b.categorySlug || '').toLowerCase();
        return (
          bCat === target ||
          bSlug === slug ||
          target.includes(bSlug) ||
          bSlug.includes(target) ||
          bCat.includes(target) ||
          target.includes(bCat)
        );
      });
      if (matched.length > 0) {
        counts[cat.id] = { category: cat, books: matched };
      }
    });

    return Object.values(counts)
      .sort((a, b) => b.books.length - a.books.length)
      .slice(0, 3);
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
                onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
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
                  <HomeShimmerSkeleton />
                ) : searchQuery.trim() ? (
                  /* Search Results */
                  <div className="pt-2">
                    <BookListView
                      title={`Search Results (${filteredBooks.length})`}
                      books={filteredBooks}
                      onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      cartBookIds={cartBookIds}
                      purchasedBookIds={purchasedBookIds}
                      wishlistBookIds={wishlistBookIds}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  </div>
                ) : selectedCategory !== 'all' ? (
                  /* Category-Specific View */
                  <div className="pt-2">
                    <BookListView
                      title={`${selectedCategory} Books (${filteredBooks.length})`}
                      books={filteredBooks}
                      onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      cartBookIds={cartBookIds}
                      purchasedBookIds={purchasedBookIds}
                      wishlistBookIds={wishlistBookIds}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  </div>
                ) : (
                  /* Default Full Home View with Peekaboo Carousel & Grids & Standard List */
                  <>
                    {/* Horizontal Carousel 1: Trending & Top Rated with Peekaboo Effect */}
                    <CarouselSection
                      title="Trending & Top Rated"
                      sectionId="trending-books"
                      viewAllHref="/collection/trending"
                      books={featuredTrendingBooks.length > 0 ? featuredTrendingBooks : books.slice(0, 8)}
                      onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      cartBookIds={cartBookIds}
                      purchasedBookIds={purchasedBookIds}
                      wishlistBookIds={wishlistBookIds}
                      onToggleWishlist={handleToggleWishlist}
                    />

                    {/* Horizontal Carousel 2: Best Sellers (Most Sold Books) */}
                    <CarouselSection
                      title="Best Sellers"
                      subtitle="Top-selling exam preparation e-books with proven student success"
                      badge="Hot"
                      sectionId="bestseller-books"
                      viewAllHref="/collection/bestsellers"
                      books={bestSellerBooks}
                      onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      cartBookIds={cartBookIds}
                      purchasedBookIds={purchasedBookIds}
                      wishlistBookIds={wishlistBookIds}
                      onToggleWishlist={handleToggleWishlist}
                    />

                    {/* Horizontal Carousel 3: Top Exam Category 1 */}
                    {topCategoriesWithBooks[0] && (
                      <CarouselSection
                        title={`${topCategoriesWithBooks[0].category.title} Guides`}
                        subtitle={topCategoriesWithBooks[0].category.seo_description || `Complete syllabus books and study material for ${topCategoriesWithBooks[0].category.title}`}
                        badge="Top Exam"
                        sectionId={`category-${topCategoriesWithBooks[0].category.id}`}
                        viewAllHref={`/category/${encodeURIComponent(topCategoriesWithBooks[0].category.seolsug || topCategoriesWithBooks[0].category.id)}`}
                        books={topCategoriesWithBooks[0].books}
                        onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                        cartBookIds={cartBookIds}
                        purchasedBookIds={purchasedBookIds}
                        wishlistBookIds={wishlistBookIds}
                        onToggleWishlist={handleToggleWishlist}
                      />
                    )}

                    {/* Horizontal Carousel 4: Top Exam Category 2 */}
                    {topCategoriesWithBooks[1] && (
                      <CarouselSection
                        title={`${topCategoriesWithBooks[1].category.title} Prep`}
                        subtitle={topCategoriesWithBooks[1].category.seo_description || `Solved question banks and previous years papers for ${topCategoriesWithBooks[1].category.title}`}
                        badge="Popular"
                        sectionId={`category-${topCategoriesWithBooks[1].category.id}`}
                        viewAllHref={`/category/${encodeURIComponent(topCategoriesWithBooks[1].category.seolsug || topCategoriesWithBooks[1].category.id)}`}
                        books={topCategoriesWithBooks[1].books}
                        onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                        cartBookIds={cartBookIds}
                        purchasedBookIds={purchasedBookIds}
                        wishlistBookIds={wishlistBookIds}
                        onToggleWishlist={handleToggleWishlist}
                      />
                    )}

                    {/* Horizontal Carousel 5: Top Exam Category 3 */}
                    {topCategoriesWithBooks[2] && (
                      <CarouselSection
                        title={`${topCategoriesWithBooks[2].category.title} Series`}
                        subtitle={topCategoriesWithBooks[2].category.seo_description || `Structured reference modules and practice sets for ${topCategoriesWithBooks[2].category.title}`}
                        badge="Curated"
                        sectionId={`category-${topCategoriesWithBooks[2].category.id}`}
                        viewAllHref={`/category/${encodeURIComponent(topCategoriesWithBooks[2].category.seolsug || topCategoriesWithBooks[2].category.id)}`}
                        books={topCategoriesWithBooks[2].books}
                        onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                        cartBookIds={cartBookIds}
                        purchasedBookIds={purchasedBookIds}
                        wishlistBookIds={wishlistBookIds}
                        onToggleWishlist={handleToggleWishlist}
                      />
                    )}

                    {/* Standard List View: Complete Catalog - Limited to max 10 */}
                    <BookListView
                      title="All Curated Study Materials & Guides"
                      limit={10}
                      viewAllHref="/collection/all"
                      books={books}
                      onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      cartBookIds={cartBookIds}
                      purchasedBookIds={purchasedBookIds}
                      wishlistBookIds={wishlistBookIds}
                      onToggleWishlist={handleToggleWishlist}
                    />
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
                onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
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
                onSelectBook={(book) => router.push(`/book/${encodeURIComponent(book.id)}`)}
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
