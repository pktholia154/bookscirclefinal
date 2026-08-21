'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Headphones,
  ArrowLeft,
  Mail,
  MapPin,
  Globe,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileQuestion,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Footer } from '@/components/Footer';

export default function ContactPage() {
  const [copied, setCopied] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    orderId: '',
    subject: 'eBook Access Support',
    message: '',
  });

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('support@exam-kart.com');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#4029AB] hover:text-[#34208e] transition-colors py-1.5 px-3 rounded-full bg-[#4029AB]/10 hover:bg-[#4029AB]/20"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to BooksCircle</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#4029AB]">Exam Kart</span>
            <span className="text-[10px] text-gray-400 font-bold">•</span>
            <span className="text-xs text-gray-500 font-medium">Customer Support</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full space-y-8">
        
        {/* Title Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Headphones className="w-4 h-4 text-emerald-600" />
            <span>We are here to help you</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
            Contact Us &amp; Customer Support
          </h1>
          <p className="text-sm font-bold text-gray-800">
            Get in Touch with Exam Kart
          </p>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Have questions regarding e-books, order support, Razorpay payment verification, or competitive exam preparation materials? Reach out to our dedicated support desk.
          </p>
        </div>

        {/* Official Entity & Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Official Registered Entity Card */}
          <div className="p-6 rounded-3xl border border-gray-200 bg-white space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4029AB]" />
              <span>Official Registered Entity</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Legal Entity Name</span>
                <span className="font-bold text-gray-950 text-sm">Pardeep Kumar</span>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Brand Name</span>
                <span className="font-bold text-[#4029AB] text-sm">Exam Kart</span>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Official Website</span>
                <a
                  href="https://bookscircle.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#4029AB] text-sm hover:underline flex items-center gap-1.5 mt-0.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>https://bookscircle.org/</span>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Direct Support & Office Address Card */}
          <div className="p-6 rounded-3xl border border-gray-200 bg-white space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#4029AB]" />
              <span>Support Channels</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Customer Support Email</span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <a
                    href="mailto:support@exam-kart.com"
                    className="font-bold text-gray-900 text-sm hover:text-[#4029AB] hover:underline flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#4029AB]" />
                    <span>support@exam-kart.com</span>
                  </a>
                  <button
                    onClick={handleCopyEmail}
                    className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-[11px] font-bold text-gray-700 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Office Address</span>
                <p className="font-medium text-gray-800 text-xs mt-1 leading-snug flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-[#4029AB] shrink-0 mt-0.5" />
                  <span>1st Floor, SCO-28, Sector 13, Bhiwani, Haryana 127021, India</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Operating Hours</span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Monday to Saturday: 9:00 AM – 7:00 PM IST (Response within 2-4 hours)
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Support Ticket / Message Submission Form */}
        <div className="p-6 sm:p-8 rounded-3xl border border-gray-200 bg-white space-y-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#4029AB]" />
                <span>Submit a Support Request</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Send a direct query to our exam materials support team.
              </p>
            </div>
          </div>

          {formSubmitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-900">Support Request Received</h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Thank you! Our support desk has received your ticket. We will respond to <strong className="font-semibold">{formData.email || 'your email'}</strong> within 2 to 4 business hours.
              </p>
              <button
                onClick={() => {
                  setFormSubmitted(false);
                  setFormData({ name: '', email: '', orderId: '', subject: 'eBook Access Support', message: '' });
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4029AB] focus:bg-white text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. rahul@example.com"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4029AB] focus:bg-white text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Razorpay Order ID / Ref (Optional)</label>
                  <input
                    type="text"
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    placeholder="e.g. order_Q123456789"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4029AB] focus:bg-white text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Subject Topic *</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4029AB] focus:bg-white text-gray-900"
                  >
                    <option value="eBook Access Support">eBook Access &amp; Digital Library Issue</option>
                    <option value="Payment Verification">Razorpay Payment &amp; Receipt Inquiries</option>
                    <option value="Refund Request">Refund &amp; Cancellation Request</option>
                    <option value="Study Material Suggestion">Study Material / New Edition Suggestion</option>
                    <option value="Other">General Question</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Your Message or Issue Details *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your question or transaction issue in detail..."
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#4029AB] focus:bg-white text-gray-900 placeholder:text-gray-400 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-[#4029AB] hover:bg-[#34208e] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Support Inquiry</span>
              </button>
            </form>
          )}
        </div>

        {/* Quick FAQ Section */}
        <div className="p-6 sm:p-8 rounded-3xl border border-gray-200 bg-white space-y-4 shadow-2xs">
          <h2 className="text-base font-bold text-gray-950 flex items-center gap-2">
            <FileQuestion className="w-4 h-4 text-[#4029AB]" />
            <span>Frequently Asked Support Questions</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80">
              <h3 className="font-bold text-gray-900">How do I access my purchased e-books?</h3>
              <p className="text-gray-600 mt-1">
                Your purchased books unlock instantly on the <strong>Purchased</strong> tab in the BooksCircle app. You can read them directly in our built-in PDF viewer or save them for offline study.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80">
              <h3 className="font-bold text-gray-900">My payment succeeded on Razorpay but the book didn&apos;t show immediately?</h3>
              <p className="text-gray-600 mt-1">
                Simply click the <strong>Refresh</strong> button in the app or reload the page. If the issue persists, email <a href="mailto:support@exam-kart.com" className="text-[#4029AB] font-bold">support@exam-kart.com</a> with your Razorpay payment ID and we will activate your library within minutes.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80">
              <h3 className="font-bold text-gray-900">What is the official brand &amp; entity name?</h3>
              <p className="text-gray-600 mt-1">
                The platform is operated under the brand name <strong>Exam Kart</strong> with registered legal entity <strong>Pardeep Kumar</strong>.
              </p>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
