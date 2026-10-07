'use client';

import React from 'react';
import { Sparkles, Zap, Check, Flame, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { CartTierDiscount, CartItem } from '@/lib/types';
import { evaluateCartTier, DEFAULT_CART_TIER_DISCOUNT } from '@/lib/services/discounts';

interface DiscountBannerProps {
  discount?: CartTierDiscount | null;
  cart?: CartItem[];
  cartSubtotal?: number;
  onOpenCart?: () => void;
  className?: string;
}

export const DiscountBanner: React.FC<DiscountBannerProps> = ({
  discount,
  cart = [],
  cartSubtotal,
  onOpenCart,
  className = '',
}) => {
  // Hide completely when discount is not provided or is inactive
  if (!discount || !discount.is_active) {
    return null;
  }

  const activeDiscountConfig = discount;
  
  // Calculate subtotal from cart items if not explicitly provided
  const computedSubtotal =
    cartSubtotal !== undefined
      ? cartSubtotal
      : cart.reduce((sum, item) => sum + (item.book.buy_price || 0), 0);

  const evaluation = evaluateCartTier(computedSubtotal, activeDiscountConfig);
  const {
    activeTier,
    nextTier,
    applicable_discount_pct,
    discountAmount,
    progressPct,
    isEligible,
  } = evaluation;

  const tiers = activeDiscountConfig.tiers || DEFAULT_CART_TIER_DISCOUNT.tiers;
  // Sort ascending for tier pill display: 500 (20%), 1000 (40%), 2000 (50%)
  const ascendingTiers = [...tiers].sort((a, b) => a.min_total - b.min_total);
  const maxDiscountPct = Math.max(...tiers.map((t) => t.discount_pct), 50);

  return (
    <section
      id="home-discount-promotional-banner"
      className={`relative overflow-hidden rounded-xl sm:rounded-2xl border-2 border-dashed border-rose-300 bg-gradient-to-r from-rose-50/40 via-transparent to-orange-50/40 p-2.5 sm:p-3.5 md:p-4 transition-all shadow-sm sm:shadow-md ${className}`}
    >
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-rose-200/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-10 w-40 h-40 bg-orange-200/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2.5 sm:gap-3">
        {/* Top Header Row: Title & Active Discount State */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300 fill-amber-300" />
              <span>Offer</span>
            </span>
            <h2 className="text-sm sm:text-base md:text-lg font-black text-gray-950 tracking-tight">
              {activeDiscountConfig.title || 'Mega Diwali Sale'}
            </h2>
          </div>

          {/* Current Applicable Discount Pill & Cart Shortcut */}
          <div className="flex items-center gap-1.5">
            {isEligible ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black bg-emerald-600 text-white shadow-2xs">
                <Flame className="w-3 h-3 fill-amber-300 text-amber-300" />
                <span>{applicable_discount_pct}% OFF APPLIED</span>
                {discountAmount > 0 && (
                  <span className="text-emerald-100 font-medium hidden sm:inline">
                    (Save ₹{discountAmount})
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-white text-rose-600 border border-rose-300 shadow-2xs">
                <Zap className="w-3 h-3 text-rose-600" />
                <span>Up to {maxDiscountPct}% OFF</span>
              </span>
            )}

            {onOpenCart && cart.length > 0 && (
              <button
                id="discount-banner-cart-btn"
                onClick={onOpenCart}
                className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center text-gray-900 hover:bg-rose-50 border border-rose-200 active:scale-95 transition-all cursor-pointer shrink-0 ml-1"
                aria-label="View Shopping Cart"
              >
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] sm:min-w-[16px] sm:h-[16px] bg-rose-600 text-white text-[8px] sm:text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-xs border border-white">
                  {cart.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Core Offers: Prominent Discount Tier Cards */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          {ascendingTiers.map((tier, idx) => {
            const reached = computedSubtotal >= tier.min_total;
            const isCurrent = activeTier?.min_total === tier.min_total;
            // Proportionally scaled discount % typography above the 13px base condition label
            const fontSizeClass = idx === 1 ? 'text-[15px] sm:text-lg md:text-xl' : 'text-[14px] sm:text-base md:text-lg';
            return (
              <div
                key={tier.min_total}
                className={`flex flex-col items-center justify-center text-center py-2.5 sm:py-3.5 px-1.5 sm:px-2.5 rounded-xl sm:rounded-2xl transition-all border ${
                  reached
                    ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950 font-bold shadow-2xs ring-1 ring-emerald-400/30'
                    : isCurrent
                    ? 'bg-rose-100/90 border-rose-400 text-rose-950 font-bold shadow-2xs ring-1 ring-rose-400/30'
                    : 'bg-white/95 border-rose-200/80 hover:border-rose-300 text-gray-800 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-1">
                  {reached && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 stroke-[3]" />}
                  <span
                    className={`${fontSizeClass} font-black tracking-tight ${
                      reached ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {tier.discount_pct}% OFF
                  </span>
                </div>
                <span className="text-[13px] sm:text-sm md:text-[15px] font-bold text-gray-700 mt-0.5 tracking-tight whitespace-nowrap">
                  on ₹{tier.min_total}+
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar towards next tier when items are in cart */}
        {nextTier && computedSubtotal > 0 && (
          <div className="w-full bg-rose-200/50 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, Math.min(100, progressPct))}%` }}
            />
          </div>
        )}
      </div>
    </section>
  );
};
