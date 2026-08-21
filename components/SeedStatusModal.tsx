'use client';

import React, { useState } from 'react';
import { X, Database, RefreshCw, CheckCircle2, Copy, Check, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SeedStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
  booksCount: number;
  categoriesCount: number;
}

const RECOMMENDED_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}`;

export const SeedStatusModal: React.FC<SeedStatusModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  booksCount,
  categoriesCount,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(RECOMMENDED_RULES);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2500);
    } catch {}
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-950">
                Firebase Firestore Status
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3.5 text-xs text-gray-600 mb-5">
            <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Firebase Project:</span>
                <span className="font-semibold text-gray-900">bookscircle-d579d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Firestore DB ID:</span>
                <span className="font-semibold text-[#4029AB]">bookscircle</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Live Books:</span>
                <span className="font-semibold text-gray-900">{booksCount} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Categories:</span>
                <span className="font-semibold text-gray-900">{categoriesCount} tags</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                <span className="text-gray-500">Data Source:</span>
                <span className="inline-flex items-center gap-1 text-[#4029AB] font-semibold">
                  <ShieldCheck className="w-3 h-3" /> Exclusively Firestore
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-[#4029AB]/15 space-y-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-[#4029AB] font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Single Source of Truth Configured</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                All mock and demo data have been completely removed from the application code. All book catalogs and categories are fetched in real-time from the Firestore database <code>bookscircle</code>.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-gray-200 space-y-2 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">Firestore Security Rules</span>
                <button
                  onClick={handleCopyRules}
                  className="text-xs font-bold text-[#4029AB] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedRules ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRules ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg font-mono text-[10px] text-gray-700 overflow-x-auto">
                <pre>{RECOMMENDED_RULES}</pre>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#4029AB] text-white hover:bg-[#34208e] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Fetching from Firestore...' : 'Refresh Firestore Data'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
