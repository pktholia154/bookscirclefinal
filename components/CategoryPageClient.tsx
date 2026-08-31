'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Heart,
  ShoppingCart,
  Check,
  Star,
  BookOpen,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { Book, Category, CartItem } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import { BookCard } from '@/components/BookCard';
import { BookListView } from '@/components/BookListView';
import { CartDrawer } from '@/components/CartDrawer';
import { PDFReaderModal } from '@/components/PDFReaderModal';
import { UserProfile } from '@/components/Header';
import {
  getWishlistIdsFromLocal,
  toggleWishlistAction,
  subscribeToWishlistChanges,
} from '@/lib/services/wishlist';
import {
  getCartFromLocal,
  addToCartAction,
  toggleCartAction,
  subscribeToCartChanges,
} from '@/lib/services/cart';
import {
  getPurchasedBookIdsFromLocal,
  savePurchasedBookIds,
} from '@/lib/offline-storage';
import {
  processRazorpayPayment,
  loadRazorpayScript,
} from '@/lib/services/razorpay';
import {
  recordUserPurchaseInFirestore,
  syncUserPurchases,
} from '@/lib/services/purchases';
import { auth, signInWithGoogle } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface CategoryPageClientProps {
  categoryTitle: string;
  categorySlug: string;
  categoryDescription?: string;
  books: Book[];
  allCategories: Category[];
}

export const CategoryPageClient: React.FC<CategoryPageClientProps> = ({
  categoryTitle,
  categorySlug,
  categoryDescription,
  books,
  allCategories,
}) => {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc' | 'rating'>('popular');
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return getWishlistIdsFromLocal();
  });
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    return getCartFromLocal();
  });
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return getPurchasedBookIdsFromLocal();
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedUser = localStorage.getItem('bookscircle_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activePdfBook, setActivePdfBook] = useState<{ book: Book; mode: 'sample' | 'full' } | null>(null);

  const showToast = (msg: string, duration = 2500) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  };

  useEffect(() => {
    const unsubWishlist = subscribeToWishlistChanges((ids) => setWishlistIds(ids));
    const unsubCart = subscribeToCartChanges((items) => setCart(items));

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL,
        };
        setCurrentUser(profile);
        try {
          const synced = await syncUserPurchases(user.uid, user.email || undefined);
          setPurchasedBookIds(synced);
        } catch {}
      }
    });

    return () => {
      unsubWishlist();
      unsubCart();
      unsubAuth();
    };
  }, []);

  const cartBookIds = useMemo(() => new Set(cart.map((i) => i.book.id)), [cart]);
  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);

  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const resultsTopRef = React.useRef<HTMLDivElement>(null);

  // Filter and Sort Books
  const filteredAndSortedBooks = useMemo(() => {
    let result = [...books];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.category && b.category.toLowerCase().includes(q)) ||
          (b.author && b.author.toLowerCase().includes(q)) ||
          (b.tags && b.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.buy_price - b.buy_price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.buy_price - a.buy_price);
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'popular':
      default:
        result.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
        break;
    }

    return result;
  }, [books, searchQuery, sortBy]);

  // Pagination calculations
  const totalItems = filteredAndSortedBooks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedBooks = useMemo(() => {
    return filteredAndSortedBooks.slice(startIndex, endIndex);
  }, [filteredAndSortedBooks, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === activePage) return;
    setCurrentPage(newPage);
    if (resultsTopRef.current) {
      const yOffset = -70;
      const y = resultsTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleSortChange = (val: 'popular' | 'price-asc' | 'price-desc' | 'rating') => {
    setSortBy(val);
    setCurrentPage(1);
  };

  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3) {
      return [1, 2, 3, 4, '...', total];
    }
    if (current >= total - 2) {
      return [1, '...', total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const handleSelectBook = (book: Book) => {
    router.push(`/book/${encodeURIComponent(book.seoslug || book.slug || book.id)}`);
  };

  const handleAddToCart = (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = toggleCartAction(cart, book, purchasedBookIds);
    setCart(res.cart);
    showToast(res.message);
  };

  const handleToggleWishlist = (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = toggleWishlistAction(book);
    setWishlistIds(res.wishlistIds);
    showToast(res.isWishlisted ? 'Added to wishlist' : 'Removed from wishlist');
  };

  const handleBuyNow = async (book: Book) => {
    if (purchasedBookIds.includes(book.id)) {
      setActivePdfBook({ book, mode: 'full' });
      return;
    }

    const item: CartItem = { book, quantity: 1 };
    showToast('Opening secure Razorpay checkout...', 2000);

    const userId = currentUser?.uid || 'guest_user';
    const userName = currentUser?.displayName || 'Aspirant';
    const userEmail = currentUser?.email || 'guest@bookscircle.org';

    try {
      await processRazorpayPayment({
        amountInRupees: book.buy_price,
        bookIds: [book.id],
        bookTitles: [book.title],
        userId,
        userName,
        userEmail,
        onSuccess: async (paymentData) => {
          savePurchasedBookIds([book.id]);
          setPurchasedBookIds((prev) => Array.from(new Set([...prev, book.id])));

          recordUserPurchaseInFirestore(userId, userEmail, [item], {
            orderId: paymentData.order_id,
            paymentId: paymentData.payment_id,
            amount: paymentData.amountInRupees,
          }).catch(() => {});

          showToast(`Purchase successful! Opening "${book.title}"...`, 3000);
          setActivePdfBook({ book, mode: 'full' });
        },
        onError: (err) => showToast(err || 'Payment was cancelled', 3500),
      });
    } catch {
      showToast('Could not initiate checkout.', 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24 selection:bg-[#4029AB] selection:text-white">
      {/* 1. Category Header & Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer shrink-0"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4 h-4 text-gray-800" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold truncate">
            <Link href="/" className="hover:text-[#4029AB] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-900 font-bold truncate">
              {categoryTitle}
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="w-4 h-4" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#4029AB] text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* 2. Category Title & SEO Description Banner */}
        <section className="bg-gray-50/80 border border-gray-200/80 rounded-3xl p-5 sm:p-6 space-y-2 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#4029AB]/10 text-[#4029AB]">
              Exam Category
            </span>
            <span className="text-xs font-bold text-gray-500">
              {books.length} {books.length === 1 ? 'eBook' : 'eBooks'} available
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-950 tracking-tight leading-snug">
            {categoryTitle}
          </h1>
          {categoryDescription && (
            <p className="text-xs sm:text-sm text-gray-600 font-normal leading-relaxed max-w-3xl">
              {categoryDescription}
            </p>
          )}
        </section>

        {/* 3. Category Switcher Chips (Horizontal scrollable) */}
        {allCategories && allCategories.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                All Categories
              </Link>
              {allCategories.map((cat) => {
                const isSelected =
                  cat.seolsug === categorySlug ||
                  cat.id === categorySlug ||
                  cat.title.toLowerCase() === categoryTitle.toLowerCase();
                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.seolsug || cat.id}`}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-[#4029AB] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.title}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. Controls: Search, Sort & Layout Switcher */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search inside this category */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={`Search in ${categoryTitle}...`}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4029AB]/30 focus:border-[#4029AB] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e: any) => handleSortChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Top Rated</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            {/* Grid / List View Toggle */}
            <div className="flex items-center border border-gray-200 rounded-xl p-0.5 bg-gray-50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#4029AB] shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-[#4029AB] shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="List View"
                aria-label="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* 5. Book Results Display */}
        <div ref={resultsTopRef} className="scroll-mt-20">
          {filteredAndSortedBooks.length === 0 ? (
            <div className="py-16 px-4 text-center border border-dashed border-gray-200 rounded-3xl bg-gray-50/50 space-y-3">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-sm font-bold text-gray-800">No books found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No e-books match your search criteria. Try clearing the search or exploring other categories.
              </p>
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="px-4 py-2 bg-[#4029AB] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#32208a] transition-all cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3.5 md:gap-4 lg:gap-5 pt-2">
                  {paginatedBooks.map((book) => (
                    <div key={book.id} className="w-full min-w-0 flex justify-center">
                      <BookCard
                        book={book}
                        layout="grid"
                        onSelect={handleSelectBook}
                        onAddToCart={(b, e) => handleAddToCart(b, e)}
                        isInCart={cartBookIds.has(book.id)}
                        isPurchased={purchasedBookIds.includes(book.id)}
                        isWishlisted={wishlistSet.has(book.id)}
                        onToggleWishlist={handleToggleWishlist}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <BookListView
                  books={paginatedBooks}
                  title=""
                  onSelectBook={handleSelectBook}
                  onAddToCart={(b, e) => handleAddToCart(b, e)}
                  onBuyNow={handleBuyNow}
                  cartBookIds={cartBookIds}
                  purchasedBookIds={purchasedBookIds}
                  wishlistBookIds={wishlistSet}
                  onToggleWishlist={handleToggleWishlist}
                />
              )}

              {/* 6. Pagination Controls (Limit 12 items per page) */}
              {totalPages > 1 && (
                <nav
                  aria-label="Category eBook pagination"
                  className="flex flex-col sm:flex-row items-center justify-between gap-3.5 pt-6 pb-2 border-t border-gray-100 mt-6"
                >
                  {/* Results Count Summary */}
                  <p className="text-xs text-gray-500 font-medium">
                    Showing <span className="font-bold text-gray-900">{startIndex + 1}</span>–<span className="font-bold text-gray-900">{endIndex}</span> of <span className="font-bold text-gray-900">{totalItems}</span> eBooks
                  </p>

                  {/* Navigation Buttons & Page Chips */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(activePage - 1)}
                      disabled={activePage === 1}
                      className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activePage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800 active:scale-95'
                      }`}
                      aria-label="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {getPageNumbers(activePage, totalPages).map((p, idx) => {
                        if (p === '...') {
                          return (
                            <span
                              key={`ellipsis-${idx}`}
                              className="w-7 h-8 sm:w-8 sm:h-8 flex items-center justify-center text-xs text-gray-400 font-bold select-none"
                            >
                              …
                            </span>
                          );
                        }
                        const pageNum = Number(p);
                        const isActive = pageNum === activePage;
                        return (
                          <button
                            key={`page-${pageNum}`}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-7 h-8 sm:w-8 sm:h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                              isActive
                                ? 'bg-[#4029AB] text-white shadow-xs scale-105'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 active:scale-95'
                            }`}
                            aria-label={`Go to page ${pageNum}`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(activePage + 1)}
                      disabled={activePage === totalPages}
                      className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activePage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                          : 'bg-[#4029AB] hover:bg-[#32208a] text-white shadow-xs active:scale-95'
                      }`}
                      aria-label="Next Page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </nav>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={() => {}}
        onRemoveItem={(bookId) => {
          const updated = cart.filter((i) => i.book.id !== bookId);
          setCart(updated);
        }}
        onClearCart={() => setCart([])}
        currentUser={currentUser}
        userEmail={currentUser?.email || undefined}
        userName={currentUser?.displayName || undefined}
        onSuccessfulCheckout={(purchasedItems) => {
          const ids = purchasedItems.map((i) => i.book.id);
          savePurchasedBookIds(ids);
          setPurchasedBookIds((prev) => Array.from(new Set([...prev, ...ids])));
          setCart([]);
          setIsCartOpen(false);
          showToast('Payment successful! E-books unlocked in your library.');
        }}
      />

      {/* PDF Reader Modal */}
      {activePdfBook && (
        <PDFReaderModal
          onClose={() => setActivePdfBook(null)}
          book={activePdfBook.book}
          mode={activePdfBook.mode}
          isPurchased={purchasedBookIds.includes(activePdfBook.book.id)}
          onBuyNow={() => {
            setActivePdfBook(null);
            handleBuyNow(activePdfBook.book);
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-950 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 pointer-events-none">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
