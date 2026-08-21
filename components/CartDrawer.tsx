'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Trash2, Plus, Minus, ArrowRight, CheckCircle2, Shield, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem } from '@/lib/types';
import { DEFAULT_BOOK_COVER } from '@/lib/data';
import { processRazorpayPayment } from '@/lib/services/razorpay';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (bookId: string, quantity: number) => void;
  onRemoveItem: (bookId: string) => void;
  onClearCart: () => void;
  onSuccessfulCheckout?: (purchasedBooks: CartItem[]) => void;
  userEmail?: string;
  userName?: string;
}

const CartItemRow: React.FC<{
  item: CartItem;
  onUpdateQuantity: (bookId: string, quantity: number) => void;
  onRemoveItem: (bookId: string) => void;
}> = ({ item, onUpdateQuantity, onRemoveItem }) => {
  const [imgSrc, setImgSrc] = useState(item.book.cover || DEFAULT_BOOK_COVER);

  return (
    <div className="py-3.5 flex gap-3 items-center">
      {/* Thumbnail: 2:3 ratio, sharp corners */}
      <div className="relative w-14 aspect-[2/3] rounded-none overflow-hidden shrink-0 bg-gray-100 border border-gray-200">
        <Image
          src={imgSrc}
          alt={item.book.title}
          fill
          sizes="60px"
          className="object-cover rounded-none"
          referrerPolicy="no-referrer"
          onError={() => setImgSrc(DEFAULT_BOOK_COVER)}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs sm:text-sm font-bold text-gray-950 line-clamp-1 leading-snug">
          {item.book.title}
        </h4>
        <p className="text-[11px] font-semibold text-gray-500 uppercase mt-0.5">
          {item.book.category} • PDF
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-gray-900">
            ₹{item.book.buy_price}
          </span>
          {item.book.list_price && item.book.list_price > item.book.buy_price && (
            <span className="text-xs text-gray-400 line-through">
              ₹{item.book.list_price}
            </span>
          )}
        </div>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-lg">
        <button
          onClick={() => onUpdateQuantity(item.book.id, item.quantity - 1)}
          className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-900 active:scale-90"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-xs font-bold text-gray-900 min-w-[14px] text-center">
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdateQuantity(item.book.id, item.quantity + 1)}
          className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-900 active:scale-90"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemoveItem(item.book.id)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSuccessfulCheckout,
  userEmail = 'reviewer.razorpay@bookscircle.org',
  userName = 'Razorpay Test Reviewer',
}) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const subtotal = items.reduce((acc, item) => acc + item.book.buy_price * item.quantity, 0);
  const totalListPrice = items.reduce(
    (acc, item) => acc + (item.book.list_price || item.book.buy_price) * item.quantity,
    0
  );
  const savings = Math.max(0, totalListPrice - subtotal);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsCheckingOut(true);
    setCheckoutError(null);

    const checkoutItems = [...items];
    const bookIds = checkoutItems.map((i) => i.book.id);
    const bookTitles = checkoutItems.map((i) => i.book.title);

    try {
      await processRazorpayPayment({
        amountInRupees: subtotal,
        bookIds,
        bookTitles,
        userName: userName,
        userEmail: userEmail,
        onSuccess: (paymentData) => {
          setIsCheckingOut(false);
          setLastPaymentId(paymentData.payment_id);
          setOrderSuccess(true);
          if (onSuccessfulCheckout) {
            onSuccessfulCheckout(checkoutItems);
          }
          setTimeout(() => {
            setOrderSuccess(false);
            onClearCart();
            onClose();
          }, 3000);
        },
        onError: (err) => {
          setIsCheckingOut(false);
          setCheckoutError(err);
        },
        onDismiss: () => {
          setIsCheckingOut(false);
        },
      });
    } catch (err: any) {
      console.error('Checkout error:', err);
      setIsCheckingOut(false);
      setCheckoutError(err?.message || 'Payment could not be initiated.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-950">Your Cart</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#4029AB]/10 text-[#4029AB]">
                {items.reduce((acc, i) => acc + i.quantity, 0)} Items
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Content */}
          {orderSuccess ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-md"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-950 mb-1">
                Payment Verified &amp; Order Successful!
              </h3>
              <p className="text-sm text-gray-600 max-w-xs mb-3">
                Your PDF ebooks have been unlocked and added to your permanent library.
              </p>
              {lastPaymentId && (
                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-mono mb-3">
                  Razorpay ID: {lastPaymentId}
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 w-full border border-gray-100">
                Receipt &amp; direct PDF access link sent to <span className="font-mono font-semibold text-gray-800">{userEmail}</span>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                Your cart is empty
              </h3>
              <p className="text-xs text-gray-500 mb-4 max-w-xs">
                Explore our catalog of UPSC, SSC, Banking, and Engineering exam PDF ebooks.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full bg-[#4029AB] text-white text-xs font-bold active:scale-95 transition-all"
              >
                Browse Books
              </button>
            </div>
          ) : (
            <>
              {/* Item list */}
              <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100 no-scrollbar">
                {items.map((item) => (
                  <CartItemRow
                    key={item.book.id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemoveItem={onRemoveItem}
                  />
                ))}
              </div>

              {/* Price summary & Checkout footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
                {checkoutError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Payment Error</p>
                      <p className="text-[11px] text-red-600 mt-0.5">{checkoutError}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">₹{subtotal}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Total Savings</span>
                      <span className="font-semibold">-₹{savings}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="font-semibold text-emerald-600">Instant PDF Download (Free)</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-950 pt-2 border-t border-gray-200">
                    <span>Total Amount</span>
                    <span className="text-base text-[#4029AB]">₹{subtotal}</span>
                  </div>
                </div>

                <button
                  id="checkout-btn"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#4029AB] text-white hover:bg-[#2E1B85] active:scale-98 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isCheckingOut ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Opening Razorpay Secure Checkout...</span>
                    </span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay ₹{subtotal} with Razorpay</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>Secured by Razorpay • UPI, Cards & NetBanking</span>
                </p>
              </div>
            </>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
