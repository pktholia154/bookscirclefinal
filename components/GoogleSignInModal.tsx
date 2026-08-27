'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '@/components/Header';
import { signInWithGoogle } from '@/lib/firebase';
import { syncUserProfileToFirestore } from '@/lib/services/users';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
  title?: string;
  subtitle?: string;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
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

export const GoogleSignInModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  title = 'Sign in to BooksCircle',
  subtitle = 'Sign in with Google to access your purchased library & reading bookmarks',
}) => {
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Direct fast Google Sign-in trigger
  const handleGoogleDirect = async () => {
    setIsSubmittingGoogle(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogle();
      if (res.user) {
        const profile: UserProfile = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || 'Google User',
          photoURL: res.user.photoURL,
        };
        syncUserProfileToFirestore({
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL,
          providerId: 'google.com',
        }).catch((err) => console.warn('Modal user sync note:', err));
        onSelectUser(profile);
        onClose();
      } else if (res.cancelled) {
        // User closed the popup
      } else if (res.fallbackNeeded) {
        setErrorMessage('Firebase authorized domain check in progress. Please retry in a moment.');
      }
    } catch (err: any) {
      if (!err?.message?.includes('popup-closed-by-user')) {
        setErrorMessage(err?.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Dialog Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', duration: 0.25 }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="text-base font-black text-gray-950 tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 text-center">
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Direct Google Sign-In Button */}
            <div className="space-y-3">
              <button
                type="button"
                id="modal-dominating-google-btn"
                onClick={handleGoogleDirect}
                disabled={isSubmittingGoogle}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-[#4029AB] text-gray-900 text-sm font-bold flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-60 group"
              >
                {isSubmittingGoogle ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-[#4029AB]" />
                ) : (
                  <GoogleIcon className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
                )}
                <span>{isSubmittingGoogle ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant 1-tap sign-in & library sync</span>
              </div>
            </div>

            {/* Security & Privacy Badge */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SSL Encrypted • Google Account Protection</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

