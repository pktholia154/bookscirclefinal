'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { CategoryChips } from '@/components/CategoryChips';
import { CarouselSection } from '@/components/CarouselSection';
import { BookListView } from '@/components/BookListView';
import { BookDetailPage } from '@/components/BookDetailPage';
import { CartDrawer } from '@/components/CartDrawer';
import { SeedStatusModal } from '@/components/SeedStatusModal';
import { BottomNav, TabKey } from '@/components/BottomNav';
import { Book, Category, CartItem } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { getPurchasedBookIdsFromLocal, savePurchasedBookIds } from '@/lib/offline-storage';
import { Check, ShoppingBag, Database, RefreshCw, ShieldCheck, BookOpen, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>(() => {
    return getPurchasedBookIdsFromLocal();
  });
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bookscircle_cart');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('LocalStorage cart load failed:', e);
      }
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isSeedModalOpen, setIsSeedModalOpen] = useState<boolean>(false);
  const [isFirebaseSynced, setIsFirebaseSynced] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Handle successful checkout
  const handleSuccessfulCheckout = (purchasedItems: CartItem[]) => {
    const newPurchasedIds = purchasedItems.map((item) => item.book.id);
    savePurchasedBookIds(newPurchasedIds);
    setPurchasedBookIds((prev) => Array.from(new Set([...prev, ...newPurchasedIds])));
    setToastMessage(`Purchase successful! ${purchasedItems.length} eBook(s) unlocked for reading.`);
  };

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bookscircle_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('LocalStorage cart save failed:', e);
    }
  }, [cart]);

  // Fetch live books & categories from Firestore db 'bookscircle'
  const loadData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) {
      setIsRefreshing(true);
    }
    try {
      const [fetchedBooks, fetchedCats] = await Promise.all([
        getBooksFromFirestore(),
        getCategoriesFromFirestore(),
      ]);

      setBooks(fetchedBooks || []);
      if (fetchedBooks && fetchedBooks.length > 0) {
        setIsFirebaseSynced(true);
      }

      // If explicit categories collection exists, use it; otherwise derive categories from books
      if (fetchedCats && fetchedCats.length > 0) {
        setCategories(fetchedCats);
      } else if (fetchedBooks && fetchedBooks.length > 0) {
        const uniqueCatNames = Array.from(
          new Set(fetchedBooks.map((b) => b.category).filter(Boolean))
        );
        const derived: Category[] = uniqueCatNames.map((c) => ({
          id: `cat-${c.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          title: c,
          seolsug: c.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          seo_description: `${c} study materials and books`,
        }));
        setCategories(derived);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Failed to load Firestore data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [fetchedBooks, fetchedCats] = await Promise.all([
          getBooksFromFirestore(),
          getCategoriesFromFirestore(),
        ]);
        if (!isMounted) return;

        setBooks(fetchedBooks || []);
        if (fetchedBooks && fetchedBooks.length > 0) {
          setIsFirebaseSynced(true);
        }

        if (fetchedCats && fetchedCats.length > 0) {
          setCategories(fetchedCats);
        } else if (fetchedBooks && fetchedBooks.length > 0) {
          const uniqueCatNames = Array.from(
            new Set(fetchedBooks.map((b) => b.category).filter(Boolean))
          );
          const derived: Category[] = uniqueCatNames.map((c) => ({
            id: `cat-${c.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            title: c,
            seolsug: c.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            seo_description: `${c} study materials and books`,
          }));
          setCategories(derived);
        } else {
          setCategories([]);
        }
      } catch (err) {
        console.error('Failed to load Firestore data on mount:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Show quick toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Cart operations
  const cartBookIds = useMemo(() => {
    return new Set(cart.map((item) => item.book.id));
  }, [cart]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const handleAddToCart = (book: Book, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.book.id === book.id);
      if (existing) {
        return prev.map((item) =>
          item.book.id === book.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { book, quantity: 1 }];
    });
    triggerToast(`Added "${book.title.slice(0, 22)}..." to cart`);
  };

  const handleUpdateQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(bookId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.book.id === bookId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (bookId: string) => {
    setCart((prev) => prev.filter((item) => item.book.id !== bookId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Filtered books based on Search Query and Category
  const filteredBooks = useMemo(() => {
    let result = books;

    if (selectedCategory !== 'all') {
      result = result.filter(
        (b) => b.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          (b.tags && b.tags.some((t) => t.toLowerCase().includes(q))) ||
          b.full_description?.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [books, selectedCategory, searchQuery]);

  // Dynamic Carousel Sections based on loaded categories
  const firstCategoryName = useMemo(() => {
    if (categories.length > 0) return categories[0].title;
    if (books.length > 0) return books[0].category;
    return 'Featured';
  }, [categories, books]);

  const secondCategoryName = useMemo(() => {
    if (categories.length > 1) return categories[1].title;
    if (books.length > 1) {
      const diff = books.find((b) => b.category !== firstCategoryName);
      if (diff) return diff.category;
    }
    return 'Newly Arrived';
  }, [categories, books, firstCategoryName]);

  // Section 1 books
  const category1Books = useMemo(() => {
    if (selectedCategory !== 'all' || searchQuery.trim()) {
      return filteredBooks.slice(0, 6);
    }
    const inFirstCat = books.filter(
      (b) => b.category.toLowerCase() === firstCategoryName.toLowerCase()
    );
    return inFirstCat.length > 0 ? inFirstCat : books.slice(0, 6);
  }, [books, filteredBooks, selectedCategory, searchQuery, firstCategoryName]);

  // Section 2 books
  const category2Books = useMemo(() => {
    if (selectedCategory !== 'all' || searchQuery.trim()) {
      return filteredBooks.slice(2, 8);
    }
    const inSecondCat = books.filter(
      (b) => b.category.toLowerCase() === secondCategoryName.toLowerCase()
    );
    return inSecondCat.length > 0 ? inSecondCat : books.slice(3, 9);
  }, [books, filteredBooks, selectedCategory, searchQuery, secondCategoryName]);

  // Section 3 books (Standard List View)
  const listViewBooks = useMemo(() => {
    if (searchQuery.trim() || selectedCategory !== 'all') {
      return filteredBooks;
    }
    return books;
  }, [books, filteredBooks, searchQuery, selectedCategory]);

  // Related books for dedicated details page
  const relatedBooks = useMemo(() => {
    if (!selectedBook) return [];
    const inSameCat = books.filter(
      (b) =>
        b.id !== selectedBook.id &&
        b.category.toLowerCase() === selectedBook.category.toLowerCase()
    );
    if (inSameCat.length > 0) return inSameCat;
    return books.filter((b) => b.id !== selectedBook.id).slice(0, 5);
  }, [books, selectedBook]);

  // When a book is selected, show the BookDetailPage
  if (selectedBook) {
    const isBookPurchased = purchasedBookIds.includes(selectedBook.id);

    return (
      <div className="min-h-screen bg-white">
        <BookDetailPage
          book={selectedBook}
          onBack={() => setSelectedBook(null)}
          onAddToCart={(b) => handleAddToCart(b)}
          onBuyNow={(b) => {
            handleAddToCart(b);
            setIsCartOpen(true);
          }}
          isInCart={cartBookIds.has(selectedBook.id)}
          isPurchased={isBookPurchased}
          relatedBooks={relatedBooks}
          onSelectRelatedBook={(b) => {
            setSelectedBook(b);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />

        {/* Slide-over Shopping Cart Drawer */}
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={handleClearCart}
          onSuccessfulCheckout={handleSuccessfulCheckout}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col selection:bg-[#4029AB]/15 selection:text-[#4029AB]">
      {/* 1. Professional Sticky Header */}
      <Header
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          startTransition(() => {
            setSearchQuery(q);
          });
        }}
        onOpenSeedModal={() => setIsSeedModalOpen(true)}
        isFirebaseSynced={isFirebaseSynced}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto pb-24 sm:pb-28">
        {activeTab === 'home' && (
          <>
            {/* Top Flexible Chips Buttons for Categories (loaded from Firebase db 'bookscircle') */}
            {categories.length > 0 && (
              <CategoryChips
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  startTransition(() => {
                    setSelectedCategory(cat);
                  });
                }}
              />
            )}

            {/* Filter Indicator */}
            {(searchQuery || selectedCategory !== 'all') && (
              <div className="px-6 py-2 flex items-center justify-between text-xs text-gray-600 bg-gray-50/80 mx-6 rounded-xl mb-2 border border-gray-100">
                <span>
                  Showing results for{' '}
                  <strong className="text-gray-900">
                    {selectedCategory !== 'all' ? selectedCategory : 'All Categories'}
                  </strong>
                  {searchQuery && (
                    <>
                      {' '}matching &quot;
                      <strong className="text-gray-900">{searchQuery}</strong>&quot;
                    </>
                  )}
                </span>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="text-[#4029AB] font-bold hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="py-16 px-6 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#4029AB] animate-spin mx-auto" />
                <p className="text-xs text-gray-500 font-semibold">
                  Connecting to Firestore database &lsquo;bookscircle&rsquo;...
                </p>
              </div>
            ) : books.length === 0 ? (
              /* Clean Empty State when Firestore DB has no books yet */
              <div className="py-16 px-6 text-center max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center mx-auto">
                  <Database className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    No books in Firestore &lsquo;bookscircle&rsquo; database
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Demo data has been removed. The application is now reading exclusively from your Firebase Firestore database.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => loadData(true)}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-[#4029AB] text-white rounded-xl text-xs font-bold hover:bg-[#34208e] transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Checking...' : 'Refresh from Firebase'}</span>
                  </button>
                  <button
                    onClick={() => setIsSeedModalOpen(true)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    Database Info
                  </button>
                </div>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="py-16 px-6 text-center">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-800">
                  No matching PDF e-books found
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Try searching with another exam keyword or reset your filter.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Horizontal Carousel 1 with Peekaboo */}
                {category1Books.length > 0 && (
                  <CarouselSection
                    sectionId="category-1-carousel"
                    title={
                      selectedCategory !== 'all'
                        ? `${selectedCategory} Essentials`
                        : `${firstCategoryName} Essentials`
                    }
                    books={category1Books}
                    onSelectBook={(book) => setSelectedBook(book)}
                    onAddToCart={handleAddToCart}
                    cartBookIds={cartBookIds}
                    onViewAll={() => setSelectedCategory('all')}
                  />
                )}

                {/* 2. Standard List View */}
                {listViewBooks.length > 0 && (
                  <BookListView
                    title={
                      selectedCategory !== 'all'
                        ? `${selectedCategory} Titles`
                        : 'All PDF E-Books (List View)'
                    }
                    books={listViewBooks.slice(0, 6)}
                    onSelectBook={(book) => setSelectedBook(book)}
                    onAddToCart={handleAddToCart}
                    cartBookIds={cartBookIds}
                  />
                )}

                {/* 3. Horizontal Carousel 2 with Peekaboo */}
                {category2Books.length > 0 && (
                  <CarouselSection
                    sectionId="category-2-carousel"
                    title={
                      selectedCategory !== 'all'
                        ? `More in ${selectedCategory}`
                        : secondCategoryName
                    }
                    books={category2Books}
                    onSelectBook={(book) => setSelectedBook(book)}
                    onAddToCart={handleAddToCart}
                    cartBookIds={cartBookIds}
                    onViewAll={() => setSelectedCategory('all')}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Library Tab View */}
        {activeTab === 'library' && (
          <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">My PDF Library</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Your purchased and unlocked study materials
              </p>
            </div>

            {books.filter((b) => purchasedBookIds.includes(b.id)).length === 0 ? (
              <div className="py-12 px-4 text-center bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                <BookOpen className="w-10 h-10 text-gray-400 mx-auto" />
                <h4 className="text-sm font-bold text-gray-800">No purchased books yet</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Books you purchase from the catalog will appear here for instant offline-ready PDF reading.
                </p>
                <button
                  onClick={() => {
                    startTransition(() => {
                      setActiveTab('home');
                    });
                  }}
                  className="px-4 py-2 bg-[#4029AB] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#34208e] cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Browse Catalog</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {books
                  .filter((b) => purchasedBookIds.includes(b.id))
                  .map((book) => (
                    <div
                      key={book.id}
                      onClick={() => setSelectedBook(book)}
                      className="flex items-start gap-3.5 p-4 rounded-2xl border border-gray-200 bg-white hover:border-[#4029AB]/40 hover:shadow-md cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <div className="relative w-14 aspect-[2/3] rounded-none overflow-hidden shrink-0 self-start bg-gray-100 border border-gray-200 shadow-2xs">
                        <Image
                          src={book.cover || DEFAULT_BOOK_COVER}
                          alt={book.title}
                          fill
                          sizes="56px"
                          className="object-cover rounded-none"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-gray-950 truncate">
                            {book.title}
                          </h4>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {book.category} • {book.pages || 200} pages
                          </p>
                        </div>
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Purchased
                          </span>
                          <span className="text-[11px] font-bold text-[#4029AB] hover:underline flex items-center gap-0.5">
                            <BookOpen className="w-3 h-3" />
                            Read
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Store Tab View */}
        {activeTab === 'store' && (
          <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">BooksCircle Store</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Browse all live Firestore PDF books
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                className="px-3.5 py-1.5 bg-[#4029AB] text-white rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Cart ({totalCartCount})</span>
              </button>
            </div>

            {books.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                No books currently stored in Firestore.
              </div>
            ) : (
              <BookListView
                title="All Firestore Catalog Titles"
                books={books}
                onSelectBook={(book) => setSelectedBook(book)}
                onAddToCart={handleAddToCart}
                cartBookIds={cartBookIds}
              />
            )}
          </div>
        )}

        {/* Account Tab View */}
        {activeTab === 'account' && (
          <div className="px-6 py-6 max-w-xl mx-auto space-y-6">
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-14 h-14 rounded-full bg-[#4029AB] text-white flex items-center justify-center font-bold text-lg">
                BC
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">BooksCircle Reader</h3>
                <p className="text-xs text-gray-500">pardeep1984@gmail.com</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  Firestore Live Sync Active
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-gray-100 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Firestore Database Info
              </h4>
              <div className="text-xs space-y-2 text-gray-600">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span>Firebase Project</span>
                  <span className="font-mono font-semibold text-gray-900">bookscircle-d579d</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span>Firestore Database</span>
                  <span className="font-mono font-semibold text-[#4029AB]">bookscircle</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span>Live Books Loaded</span>
                  <span className="font-semibold text-gray-900">{books.length} items</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Categories</span>
                  <span className="font-semibold text-gray-900">{categories.length} categories</span>
                </div>
              </div>
              <button
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="w-full mt-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Re-sync from Firebase</span>
              </button>
            </div>
          </div>
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
      />

      {/* Firebase Database Status Modal */}
      <SeedStatusModal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        onRefreshData={() => loadData(true)}
        booksCount={books.length}
        categoriesCount={categories.length}
      />

      {/* Fixed High Density Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          startTransition(() => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }}
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
