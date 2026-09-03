'use client';

import React from 'react';
import { Sparkles, Zap, ShoppingBag, ArrowRight, Check, Flame, ShoppingCart } from 'lucide-react';
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
  discount = DEFAULT_CART_TIER_DISCOUNT,
  cart = [],
  cartSubtotal,
  onOpenCart,
  className = '',
}) => {
  const activeDiscountConfig = discount || DEFAULT_CART_TIER_DISCOUNT;
  
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
    amountNeededForNextTier,
    nudgeMessage,
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
      className={`relative overflow-hidden rounded-xl sm:rounded-2xl border-2 border-dashed border-rose-300 bg-gradient-to-r from-rose-50/30 via-transparent to-orange-50/30 p-2 sm:p-3 md:p-4 transition-all shadow-sm sm:shadow-md ${className}`}
    >
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-rose-200/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-10 w-40 h-40 bg-orange-200/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-1.5 sm:gap-3">
        {/* Top Header Row: Title & Active Discount State */}
        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
              <Sparkles className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
              <span>Offer</span>
            </span>
            <h2 className="text-[13px] sm:text-base md:text-lg font-black text-gray-950 tracking-tight">
              {activeDiscountConfig.title || 'Mega Diwali Sale'}
            </h2>
          </div>

          {/* Current Applicable Discount Pill */}
          <div className="flex items-center gap-1">
            {isEligible ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-black bg-emerald-600 text-white shadow-2xs animate-pulse">
                <Flame className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-amber-300 text-amber-300" />
                <span>{applicable_discount_pct}% OFF APPLIED</span>
                {discountAmount > 0 && (
                  <span className="text-emerald-100 font-medium hidden sm:inline">
                    (Save ₹{discountAmount})
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-bold bg-white text-rose-600 border border-rose-300 shadow-2xs">
                <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-600" />
                <span>Unlock Up to {maxDiscountPct}% OFF</span>
              </span>
            )}
          </div>
        </div>

        {/* Middle: Nudge Message */}
        <div className="flex flex-row items-center justify-between gap-1.5 sm:gap-2 bg-white/85 backdrop-blur-xs rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 border border-rose-200/60">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isEligible ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
            }`}>
              {isEligible ? (
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              ) : (
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-sm font-bold text-gray-900 leading-tight sm:leading-snug">
                {nudgeMessage}
              </p>
              {computedSubtotal > 0 && (
                <p className="text-[9px] sm:text-[11px] text-gray-500 font-medium mt-0.5 sm:mt-0">
                  Current Cart: <strong className="text-gray-900 font-bold">₹{computedSubtotal}</strong>
                  {isEligible && (
                    <span className="text-emerald-700 font-semibold ml-1">
                      → Pay only ₹{evaluation.finalTotal}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {onOpenCart && (
            <button
              onClick={onOpenCart}
              className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 hover:bg-rose-100 border border-gray-200/80 active:scale-95 transition-all cursor-pointer shrink-0 ml-1"
              aria-label="View Shopping Cart"
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] sm:min-w-[16px] sm:h-[16px] bg-rose-600 text-white text-[8px] sm:text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-xs border border-white">
                  {cart.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Bottom: Visual Tier Thresholds and Progress Bar */}
        <div className="space-y-1 sm:space-y-1.5">
          {/* Tier Pills */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {ascendingTiers.map((tier) => {
              const reached = computedSubtotal >= tier.min_total;
              const isCurrent = activeTier?.min_total === tier.min_total;
              return (
                <div
                  key={tier.min_total}
                  className={`flex flex-col items-center justify-center text-center py-0.5 sm:py-1 px-1 sm:px-1.5 rounded-lg sm:rounded-xl transition-all border ${
                    reached
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                      : isCurrent
                      ? 'bg-rose-100 border-rose-400 text-rose-700 font-bold'
                      : 'bg-white/70 border-gray-200/80 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {reached && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 stroke-[3]" />}
                    <span className={`text-[10px] sm:text-xs font-black ${
                      reached ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {tier.discount_pct}% OFF
                    </span>
                  </div>
                  <span className="text-[8px] sm:text-[10px] text-gray-500 font-medium">
                    on ₹{tier.min_total}+
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar towards next tier */}
          {nextTier && (
            <div className="w-full bg-rose-200/50 rounded-full h-1 sm:h-1.5 overflow-hidden">
              <motion.div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, Math.min(100, progressPct))}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

