'use client';

import React from 'react';

export const HomeShimmerSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-pulse px-4 sm:px-6 pt-2 pb-12">
      {/* Category Chips Shimmer */}
      <div className="flex items-center gap-2 overflow-x-hidden py-1">
        <div className="h-8 w-16 bg-gray-200/80 rounded-full shrink-0" />
        <div className="h-8 w-24 bg-gray-200/80 rounded-full shrink-0" />
        <div className="h-8 w-32 bg-gray-200/80 rounded-full shrink-0" />
        <div className="h-8 w-28 bg-gray-200/80 rounded-full shrink-0" />
        <div className="h-8 w-20 bg-gray-200/80 rounded-full shrink-0" />
        <div className="h-8 w-36 bg-gray-200/80 rounded-full shrink-0" />
      </div>

      {/* Horizontal Carousel Section 1 Shimmer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 bg-gray-200/90 rounded-md" />
          <div className="h-4 w-16 bg-gray-200/70 rounded-md" />
        </div>
        <div className="flex gap-3 overflow-x-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-[124px] sm:w-[148px] shrink-0 space-y-2"
            >
              <div className="aspect-[3/4] w-full bg-gradient-to-br from-gray-200 to-gray-300/80 rounded-none shadow-2xs relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
              <div className="h-3 w-3/4 bg-gray-200 rounded" />
              <div className="h-3 w-1/2 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid / List Section 2 Shimmer */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="h-5 w-52 bg-gray-200/90 rounded-md" />
          <div className="h-4 w-16 bg-gray-200/70 rounded-md" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] w-full bg-gradient-to-br from-gray-200 to-gray-300/80 rounded-none shadow-2xs relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-2/3 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid Section 3 Shimmer */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-gray-200/90 rounded-md" />
          <div className="h-4 w-16 bg-gray-200/70 rounded-md" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] w-full bg-gradient-to-br from-gray-200 to-gray-300/80 rounded-none shadow-2xs relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
              <div className="h-3 w-4/5 bg-gray-200 rounded" />
              <div className="h-3 w-1/3 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
