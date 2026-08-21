'use client';

import React from 'react';
import { Book } from '@/lib/types';
import { BookDetailPage } from './BookDetailPage';

interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onAddToCart: (book: Book) => void;
  onBuyNow: (book: Book) => void;
  isInCart: boolean;
  relatedBooks?: Book[];
  onSelectRelatedBook?: (book: Book) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onAddToCart,
  onBuyNow,
  isInCart,
  relatedBooks = [],
  onSelectRelatedBook,
}) => {
  if (!book) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <BookDetailPage
        book={book}
        onBack={onClose}
        onAddToCart={onAddToCart}
        onBuyNow={onBuyNow}
        isInCart={isInCart}
        relatedBooks={relatedBooks}
        onSelectRelatedBook={onSelectRelatedBook}
      />
    </div>
  );
};
