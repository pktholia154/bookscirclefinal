'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  User as UserIcon,
  Mail,
  Share2,
  Copy,
  Check,
  HardDrive,
  BookOpen,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Send,
  MessageCircle,
  Smartphone,
  LogIn,
  LogOut,
  Key,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { getOfflineStorageStats, clearAllOfflinePdfs } from '@/lib/offline-storage';
import { UserProfile } from '@/components/Header';

// Crisp Google 'G' vector icon component
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

interface ProfileViewProps {
  currentUser: UserProfile | null;
  purchasedCount: number;
  onNavigateToPurchased: () => void;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  purchasedCount = 0,
  onNavigateToPurchased,
  onGoogleSignIn,
  onSignOut,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [offlineStats, setOfflineStats] = useState<{ count: number; totalBytes: number }>({
    count: 0,
    totalBytes: 0,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    getOfflineStorageStats().then(setOfflineStats);
  }, []);

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://bookscircle.org';
  };

  const shareText =
    'Check out BooksCircle for competitive exam prep books, curated study guides, and instant offline PDF reading!';

  // Primary Native Web Share API
  const handleNativeShare = async () => {
    const url = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BooksCircle - Digital PDF Library',
          text: shareText,
          url: url,
        });
        showToast('Shared successfully!');
      } catch {
        // Share dismissed
      }
    } else {
      handleCopyLink();
    }
  };

  // Copy Link to Clipboard
  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setCopied(true);
      showToast('App link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Could not copy link to clipboard');
    }
  };

  // Trigger Sign In
  const handleGoogleAuth = async () => {
    setIsSigningIn(true);
    try {
      await onGoogleSignIn();
    } finally {
      setIsSigningIn(false);
    }
  };

  // Social Share Handlers
  const handleWhatsAppShare = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(shareText + '\n');
    window.open(`https://api.whatsapp.com/send?text=${text}${url}`, '_blank');
  };

  const handleTelegramShare = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleTwitterShare = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent('Recommended: BooksCircle PDF Library');
    const body = encodeURIComponent(`${shareText}\n\nVisit: ${getShareUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Clear offline cache
  const handleClearCache = async () => {
    if (confirm('Clear all downloaded offline PDFs from this device?')) {
      await clearAllOfflinePdfs();
      setOfflineStats({ count: 0, totalBytes: 0 });
      showToast('Device offline PDF storage cleared.');
    }
  };

  const formattedStorage = (offlineStats.totalBytes / (1024 * 1024)).toFixed(1);

  const displayUserName = currentUser?.displayName || 'Guest Reader';
  const displayUserEmail = currentUser?.email || 'Not signed in';
  const userInitial = displayUserName.charAt(0).toUpperCase();

  return (
    <div className="w-full px-4 sm:px-6 py-5 max-w-2xl mx-auto space-y-6">
      {/* 1. Profile Identity Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left shadow-2xs">
        {/* Avatar */}
        {currentUser?.photoURL ? (
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-md shrink-0 ring-4 ring-white border border-gray-200">
            <Image
              src={currentUser.photoURL}
              alt={displayUserName}
              fill
              sizes="80px"
              className="object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0 ring-4 ring-white">
            <span>{userInitial}</span>
            {currentUser && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        )}

        {/* User Info Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 justify-center sm:justify-start">
            <h2 className="text-lg sm:text-xl font-black text-gray-950">{displayUserName}</h2>
            {currentUser ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                <ShieldCheck className="w-2.5 h-2.5" />
                Verified Reader
              </span>
            ) : (
              <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                Guest Mode
              </span>
            )}
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-gray-600 mt-1 font-medium">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-mono text-gray-800">{displayUserEmail}</span>
          </div>

          <p className="text-[11px] text-gray-500 mt-2">
            {currentUser
              ? 'Account synchronized • Instant access to purchased e-books & bookmarks'
              : 'Sign in to access your purchased PDF library across all your devices.'}
          </p>

          {/* Action Buttons: Sign In / Sign Out */}
          <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            {!currentUser ? (
              <button
                id="profile-login-btn"
                onClick={handleGoogleAuth}
                disabled={isSigningIn}
                className="px-4 py-2 bg-[#4029AB] hover:bg-[#34208e] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSigningIn ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>Login</span>
              </button>
            ) : (
              <button
                id="profile-signout-btn"
                onClick={() => {
                  onSignOut();
                  showToast('Signed out successfully.');
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-red-600 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Account Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Card 1: Purchased Books */}
        <div
          onClick={onNavigateToPurchased}
          className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-[#4029AB]/40 hover:shadow-xs transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <BookOpen className="w-4 h-4 text-[#4029AB]" />
            <span className="text-[10px] font-bold text-[#4029AB]">View</span>
          </div>
          <p className="text-2xl font-black text-gray-950">{purchasedCount}</p>
          <p className="text-xs text-gray-500 font-semibold">Purchased Books</p>
        </div>

        {/* Card 2: Offline Downloaded */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-1">
          <div className="flex items-center justify-between">
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-600">Active</span>
          </div>
          <p className="text-2xl font-black text-gray-950">{offlineStats.count}</p>
          <p className="text-xs text-gray-500 font-semibold">Offline Ready</p>
        </div>

        {/* Card 3: Storage Used */}
        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white border border-gray-200 space-y-1">
          <div className="flex items-center justify-between">
            <Smartphone className="w-4 h-4 text-gray-600" />
            <span className="text-[10px] font-bold text-gray-400">Device</span>
          </div>
          <p className="text-2xl font-black text-gray-950">{formattedStorage} MB</p>
          <p className="text-xs text-gray-500 font-semibold">Offline Cache</p>
        </div>
      </div>

      {/* 4. Share BooksCircle App Section */}
      <div className="p-5 sm:p-6 rounded-3xl border border-gray-200 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-950 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-[#4029AB]" />
              <span>Share BooksCircle App</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Recommend study materials and books to friends and colleagues.
            </p>
          </div>
        </div>

        {/* Primary Share Button */}
        <button
          onClick={handleNativeShare}
          className="w-full py-3 px-4 rounded-2xl bg-[#4029AB] hover:bg-[#34208e] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Application Link</span>
        </button>

        {/* Quick Social Share Options Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'border-gray-200 hover:bg-gray-50 text-gray-800'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          {/* Telegram */}
          <button
            onClick={handleTelegramShare}
            className="py-2.5 px-3 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-sky-600" />
            <span>Telegram</span>
          </button>

          {/* Email */}
          <button
            onClick={handleEmailShare}
            className="py-2.5 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-gray-600" />
            <span>Email</span>
          </button>
        </div>
      </div>

      {/* 5. App Storage & Maintenance */}
      <div className="p-5 rounded-3xl border border-gray-200 bg-white space-y-3 shadow-2xs">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
          Device & Storage Management
        </h4>

        <div className="flex items-center justify-between text-xs py-2 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">Offline PDFs Encrypted Storage</p>
            <p className="text-[11px] text-gray-500">
              {offlineStats.count} items stored locally ({formattedStorage} MB)
            </p>
          </div>
          {offlineStats.count > 0 && (
            <button
              onClick={handleClearCache}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs py-1">
          <span className="text-gray-500">App Version</span>
          <span className="font-mono text-gray-700 font-semibold">BooksCircle v1.2.0</span>
        </div>
      </div>

      {/* 6. Razorpay Compliance & Legal Policies */}
      <div className="p-5 sm:p-6 rounded-3xl border border-gray-200 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#4029AB]" />
              <span>Legal Policies &amp; Customer Support</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Exam Kart official policies and Razorpay verified merchant terms.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <a
            href="/privacy-policy"
            className="p-3 rounded-2xl bg-gray-50 hover:bg-[#4029AB]/5 border border-gray-200/80 hover:border-[#4029AB]/40 font-semibold text-gray-800 hover:text-[#4029AB] flex items-center justify-between transition-all"
          >
            <span>📜 Privacy Policy</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>

          <a
            href="/terms-and-conditions"
            className="p-3 rounded-2xl bg-gray-50 hover:bg-[#4029AB]/5 border border-gray-200/80 hover:border-[#4029AB]/40 font-semibold text-gray-800 hover:text-[#4029AB] flex items-center justify-between transition-all"
          >
            <span>⚖️ Terms &amp; Conditions</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>

          <a
            href="/license-agreement"
            className="p-3 rounded-2xl bg-gray-50 hover:bg-[#4029AB]/5 border border-gray-200/80 hover:border-[#4029AB]/40 font-semibold text-gray-800 hover:text-[#4029AB] flex items-center justify-between transition-all"
          >
            <span>🛡️ License Agreement</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>

          <a
            href="/refund-policy"
            className="p-3 rounded-2xl bg-gray-50 hover:bg-[#4029AB]/5 border border-gray-200/80 hover:border-[#4029AB]/40 font-semibold text-gray-800 hover:text-[#4029AB] flex items-center justify-between transition-all"
          >
            <span>💳 Refund Policy</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </a>

          <a
            href="/contact"
            className="sm:col-span-2 p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200 font-semibold text-emerald-900 flex items-center justify-between transition-all"
          >
            <span>📞 Contact Us &amp; Customer Support</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
          </a>
        </div>

        {/* Registered Entity Box */}
        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-[11px] text-gray-600 space-y-1">
          <p><strong className="text-gray-900 font-bold">Legal Entity:</strong> Pardeep Kumar</p>
          <p><strong className="text-gray-900 font-bold">Brand Name:</strong> Exam Kart</p>
          <p><strong className="text-gray-900 font-bold">Email:</strong> support@exam-kart.com</p>
          <p><strong className="text-gray-900 font-bold">Address:</strong> 1st Floor, SCO-28, Sector 13, Bhiwani, Haryana 127021</p>
          <p><strong className="text-gray-900 font-bold">Website:</strong> https://bookscircle.org/</p>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-950 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 pointer-events-none">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
