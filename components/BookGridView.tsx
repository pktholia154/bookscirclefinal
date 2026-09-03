'use client';

import React from 'react';
import { Book } from '@/lib/types';
import { CarouselSection } from '@/components/CarouselSection';

interface BookGridViewProps {
  title: string;
  subtitle?: string;
  books: Book[];
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, e?: React.MouseEvent) => void;
  onBuyNow?: (book: Book) => void;
  cartBookIds?: Set<string>;
  purchasedBookIds?: string[];
  wishlistBookIds?: Set<string>;
  onToggleWishlist?: (book: Book, e: React.MouseEvent) => void;
  viewAllHref?: string;
  onViewAll?: () => void;
  badge?: string;
  limit?: number;
  sectionId?: string;
}

export const BookGridView: React.FC<BookGridViewProps> = ({
  title,
  subtitle,
  books,
  onSelectBook,
  onAddToCart,
  onBuyNow,
  cartBookIds = new Set(),
  purchasedBookIds = [],
  wishlistBookIds = new Set(),
  onToggleWishlist,
  viewAllHref,
  onViewAll,
  badge,
  limit,
  sectionId,
}) => {
  return (
    <CarouselSection
      title={title}
      subtitle={subtitle}
      badge={badge}
      limit={limit || 12}
      books={books}
      onSelectBook={onSelectBook}
      onAddToCart={onAddToCart}
      onBuyNow={onBuyNow}
      cartBookIds={cartBookIds}
      purchasedBookIds={purchasedBookIds}
      wishlistBookIds={wishlistBookIds}
      onToggleWishlist={onToggleWishlist}
      sectionId={sectionId}
      onViewAll={onViewAll}
      viewAllHref={viewAllHref}
    />
  );
};
