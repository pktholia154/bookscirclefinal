'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Header, UserProfile } from '@/components/Header';
import { PurchasedView } from '@/components/PurchasedView';
import { BottomNav, TabKey } from '@/components/BottomNav';
import { CartDrawer } from '@/components/CartDrawer';
import { IOSInstallGuideModal } from '@/components/IOSInstallGuideModal';
import { InstallSuccessModal } from '@/components/InstallSuccessModal';
import { Book, CartItem } from '@/lib/types';
import { FREE_SAMPLE_BOOK_ID, FREE_SAMPLE_BOOK, INITIAL_BOOKS } from '@/lib/data';
import { getCachedBooksSync, subscribeToFirestoreBooks } from '@/lib/services/books';
import { getPurchasedBookIdsFromLocal, savePurchasedBookIds } from '@/lib/offline-storage';
import { syncUserPurchases, subscribeToUserPurchases } from '@/lib/services/purchases';
import { syncUserProfileToFirestore } from '@/lib/services/users';
import { getCartFromLocal, subscribeToCartChanges, clearCartAction } from '@/lib/services/cart';
import {
  auth,
  signInWithGoogle,
  getCachedAuthUserSync,
  subscribeToUnifiedAuthState,
  persistAndBroadcastAuthUser,
} from '@/lib/firebase';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { triggerNativeLoading } from '@/components/NativePageLoadingIndicator';
import {
  executePurchaseQuickJump,
  subscribeToPurchasesUpdated,
  setTargetHomeTab,
} from '@/lib/services/quick-jump';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';

interface PurchasedPageClientProps {
  initialBooks?: Book[];
}

export const PurchasedPageClient: React.FC<PurchasedPageClientProps> = ({
  initialBooks = INITIAL_BOOKS,
}) => {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [books, setBooks] = useState<Book[]>(
    initialBooks && initialBooks.length > 0 ? initialBooks : INITIAL_BOOKS
  );

  // Free access sample book BK0002286 is guaranteed on day 1 for all visitors and logged in users
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>([FREE_SAMPLE_BOOK_ID]);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PWA Install hooks
  const {
    isInstallable,
    isIOSPromptOpen,
    isInstallSuccessOpen,
    promptInstall,
    closeIOSPrompt,
    closeInstallSuccess,
  } = usePWAInstall();

  const showToast = useCallback((msg: string | null, duration = 2500) => {
    if (!msg) {
      setToastMessage(null);
      return;
    }
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, duration);
  }, []);

  // Prefetch main destinations for lightning navigation
  useEffect(() => {
    router.prefetch('/');
    router.prefetch('/search');
  }, [router]);

  // Client-side hydration
  useEffect(() => {
    try {
      const cached = getCachedBooksSync();
      if (cached && cached.length > 0) {
        setBooks((prev) => (cached.length >= prev.length ? cached : prev));
      }
    } catch {}

    try {
      const cachedUser = getCachedAuthUserSync();
      if (cachedUser) setCurrentUser(cachedUser);
    } catch {}

    try {
      const localPurchased = getPurchasedBookIdsFromLocal();
      setPurchasedBookIds(Array.from(new Set([FREE_SAMPLE_BOOK_ID, ...localPurchased])));
    } catch {}

    try {
      const localCart = getCartFromLocal();
      if (localCart && localCart.length > 0) {
        setCart(localCart);
      }
    } catch {}

    const unsubCart = subscribeToCartChanges((updated) => setCart(updated));
    const unsubBooks = subscribeToFirestoreBooks((updatedBooks) => {
      if (updatedBooks && updatedBooks.length > 0) {
        setBooks(updatedBooks);
      }
    });

    const unsubAuth = subscribeToUnifiedAuthState(async (profile) => {
      setCurrentUser(profile);
      if (profile?.uid) {
        try {
          const synced = await syncUserPurchases(profile.uid, profile.email || undefined);
          if (synced && synced.length > 0) {
            setPurchasedBookIds((prev) => Array.from(new Set([...prev, ...synced, FREE_SAMPLE_BOOK_ID])));
          }
        } catch {}
      }
    });

    const unsubPurchasesUpdated = subscribeToPurchasesUpdated((newIds) => {
      setPurchasedBookIds((prev) => Array.from(new Set([...prev, ...newIds, FREE_SAMPLE_BOOK_ID])));
    });

    return () => {
      unsubCart();
      unsubBooks();
      unsubAuth();
      unsubPurchasesUpdated();
    };
  }, []);

  // Continuous listener for user purchases
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubPurchases = subscribeToUserPurchases(
      currentUser.uid,
      currentUser.email || undefined,
      (syncedIds) => {
        setPurchasedBookIds(Array.from(new Set([FREE_SAMPLE_BOOK_ID, ...syncedIds])));
      }
    );
    return () => unsubPurchases();
  }, [currentUser?.uid, currentUser?.email]);

  const handleSyncPurchases = async () => {
    if (!currentUser?.uid) return;
    try {
      const synced = await syncUserPurchases(currentUser.uid, currentUser.email || undefined);
      if (synced && synced.length > 0) {
        setPurchasedBookIds(Array.from(new Set([FREE_SAMPLE_BOOK_ID, ...synced])));
      }
    } catch {}
  };

  const handleOpenLogin = async (callback?: (user: UserProfile) => void) => {
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
        }).catch(() => {});
        handleSyncPurchases();
        if (callback) callback(profile);
      }
    } catch (err: any) {
      if (!err?.message?.includes('popup-closed-by-user')) {
        showToast('Google sign in error: ' + (err?.message || 'Failed'), 3500);
      }
    }
  };

  const totalCartCount = useMemo(() => {
    return (Array.isArray(cart) ? cart : []).reduce((acc, i) => acc + (i?.quantity || 1), 0);
  }, [cart]);

  const handleTabChange = (tab: TabKey) => {
    if (tab === 'cart') {
      setIsCartOpen(true);
      return;
    }
    if (tab === 'purchased') {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    triggerNativeLoading(120);
    startTransition(() => {
      setTargetHomeTab(tab || 'home');
      router.push('/');
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 sm:pb-28 antialiased selection:bg-[#1c0ca3] selection:text-white">
      {/* Top Header */}
      <Header
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentUser={currentUser}
        onGoogleSignIn={handleOpenLogin}
        onNavigateToProfile={() => handleTabChange('profile')}
        onNavigateToHome={() => handleTabChange('home')}
        onOpenDedicatedSearch={() => router.push('/search')}
        isInstallable={isInstallable}
        onInstall={promptInstall}
      />

      {/* Main Purchased Library Content View */}
      <main className="w-full">
        <PurchasedView
          books={books}
          purchasedBookIds={purchasedBookIds}
          currentUser={currentUser}
          onSelectBook={(book) => {
            triggerNativeLoading(150);
            router.push(`/book/${encodeURIComponent(book.seoslug || book.slug || book.id)}`);
          }}
          onNavigateHome={() => {
            triggerNativeLoading(150);
            router.push('/');
          }}
          onSyncPurchases={handleSyncPurchases}
        />
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onRemoveItem={(id) => {
          setCart((prev) => prev.filter((i) => i.book.id !== id));
        }}
        onClearCart={() => {
          clearCartAction();
          setCart([]);
        }}
        onSuccessfulCheckout={(purchasedItems, paymentData) => {
          executePurchaseQuickJump({
            itemsToBuy: purchasedItems,
            paymentData,
            currentUser,
            router,
            onSuccessToast: (msg) => showToast(msg, 3000),
            onBeforeRedirect: () => setIsCartOpen(false),
          });
        }}
        currentUser={currentUser}
        onRequireLogin={(cb) => handleOpenLogin(cb)}
        userEmail={currentUser?.email || undefined}
        userName={currentUser?.displayName || undefined}
      />

      {/* PWA Install Modals */}
      <IOSInstallGuideModal isOpen={isIOSPromptOpen} onClose={closeIOSPrompt} />
      <InstallSuccessModal isOpen={isInstallSuccessOpen} onClose={closeInstallSuccess} />

      {/* Fixed Bottom Navigation - Active Tab is 'purchased' */}
      <BottomNav
        activeTab="purchased"
        onTabChange={handleTabChange}
        cartCount={totalCartCount}
        purchasedCount={purchasedBookIds.length}
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
