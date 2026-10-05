'use client';

import React from 'react';
import { BookOpen, Play, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { ReadingProgressRecord } from '@/lib/offline-storage';

interface ReadingProgressCardProps {
  progress: ReadingProgressRecord;
  onResume: (progress: ReadingProgressRecord) => void;
  onReset?: () => void;
  className?: string;
}

export const ReadingProgressCard: React.FC<ReadingProgressCardProps> = ({
  progress,
  onResume,
  onReset,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round(progress.progressPercentage || 0)));
  const isCompleted = percentage >= 100;

  // Format detail text (e.g. Page 14 of 48 • PDF)
  const formatLabel = progress.format === 'pdf' ? 'PDF eBook' : 'ePub / Notes';
  const detailLabel =
    progress.format === 'pdf' && progress.page
      ? `Page ${progress.page}${progress.totalPdfPages ? ` of ${progress.totalPdfPages}` : ''}`
      : progress.sectionIndex !== undefined
      ? `Chapter ${progress.sectionIndex + 1}${
          progress.totalSections ? ` of ${progress.totalSections}` : ''
        }`
      : `${percentage}% complete`;

  // Relative time format
  const formatLastRead = (isoString?: string) => {
    if (!isoString) return 'Recently';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      id="book-detail-reading-progress-card"
      className={`rounded-xl sm:rounded-2xl border border-gray-200/90 bg-white p-3 sm:p-3.5 shadow-2xs transition-all ${className}`}
    >
      {/* Top Header: Badge & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-[#5e17eb]/10 text-[#5e17eb] border border-[#5e17eb]/20'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <BookOpen className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-gray-950 uppercase tracking-wider">
                {isCompleted ? 'Book Finished' : 'Reading Progress'}
              </span>
              <span className="text-[9px] text-gray-300">•</span>
              <span className="text-[11px] text-gray-500 font-medium truncate">
                {formatLabel}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">
              {detailLabel} • Read {formatLastRead(progress.lastReadAt)}
            </p>
          </div>
        </div>

        {/* Percentage Pill */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-xs font-black px-2 py-0.5 rounded-full ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-[#5e17eb]/10 text-[#5e17eb]'
            }`}
          >
            {percentage}%
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="mt-2.5">
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Reading progress: ${percentage}%`}
          className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/60"
        >
          <div
            style={{ width: `${percentage}%` }}
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-emerald-500'
                : 'bg-[#5e17eb]'
            }`}
          />
        </div>
      </div>

      {/* Action Row */}
      <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
        <button
          id="btn-resume-reading"
          onClick={() => onResume(progress)}
          className={`flex-1 h-8 sm:h-8.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-2xs ${
            isCompleted
              ? 'bg-gray-900 hover:bg-gray-800 text-white'
              : 'bg-[#5e17eb] hover:bg-[#4d0ec5] text-white'
          }`}
        >
          {isCompleted ? (
            <>
              <RotateCcw className="w-3 h-3" />
              <span>Read Again</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>Resume ({percentage}%)</span>
            </>
          )}
        </button>

        {onReset && (
          <button
            type="button"
            id="btn-reset-reading-progress"
            onClick={onReset}
            title="Reset progress to 0%"
            aria-label="Reset reading progress"
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
