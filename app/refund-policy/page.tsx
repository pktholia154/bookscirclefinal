import type { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, Mail, MapPin, Globe, CheckCircle2, Clock, HelpCircle, ShieldCheck } from 'lucide-react';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Exam Kart (Legal: Pardeep Kumar) - BooksCircle',
  description: 'Refund & Cancellation Policy for digital e-book purchases on Exam Kart (Legal entity: Pardeep Kumar) at https://bookscircle.org/. Clear guidelines on digital fulfillment and refunds.',
  alternates: {
    canonical: 'https://bookscircle.org/refund-policy',
  },
};

export default function RefundPolicyPage() {
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
            <span className="text-xs text-gray-500 font-medium">Refund Policy</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full space-y-8">
        {/* Title Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4029AB]/10 text-[#4029AB] text-xs font-bold">
            <RefreshCw className="w-4 h-4" />
            <span>Official Razorpay Compliance Policy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
            Refund & Cancellation Policy
          </h1>
          <p className="text-sm font-bold text-gray-700">
            Fair & Transparent Refunds
          </p>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Clear guidelines on cancellations, digital download delivery, and eligible refund requests for <strong className="text-gray-900 font-bold">Exam Kart</strong> (Legal entity: <strong className="text-gray-900 font-bold">Pardeep Kumar</strong>) purchases on <a href="https://bookscircle.org/" className="text-[#4029AB] font-bold hover:underline">https://bookscircle.org/</a>.
          </p>
          <p className="text-[11px] text-gray-400 font-medium pt-1">
            Last Updated: August 2026 • 5-7 Day Razorpay Refund Settlement
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">1</span>
              <span>Nature of Digital E-Books</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              All products offered on Exam Kart (<a href="https://bookscircle.org/" className="text-[#4029AB] font-semibold hover:underline">https://bookscircle.org/</a>) are instant digital PDF downloads and e-books. Once purchased, digital access is unlocked immediately in your digital library.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">2</span>
              <span>Order Cancellation Policy</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Due to immediate digital fulfillment, orders cannot be cancelled once payment is processed and the e-book has been added to your purchased library.
            </p>
          </section>

          {/* Section 3 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">3</span>
              <span>Eligible Refund Scenarios</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              We provide full refunds under the following specific circumstances:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700 pt-1 pl-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 font-bold">Duplicate Purchases:</strong> Accidental double payment for the exact same e-book within a 24-hour period.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 font-bold">Corrupted File / Technical Issue:</strong> Severe file damage or technical failure preventing reading, where our support team cannot provide a corrected copy within 48 hours.</span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">4</span>
              <span>How to Request a Refund</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              To initiate a refund request, follow these steps:
            </p>
            <ol className="space-y-2.5 text-xs sm:text-sm text-gray-700 pt-1 pl-2">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-xs font-bold shrink-0">a</span>
                <span>Send an email to <a href="mailto:support@exam-kart.com" className="text-[#4029AB] font-bold hover:underline">support@exam-kart.com</a> within <strong>7 days</strong> of purchase.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-xs font-bold shrink-0">b</span>
                <span>Include your registered email ID, transaction reference / Razorpay Order ID, and book title.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center text-xs font-bold shrink-0">c</span>
                <span>Provide a brief description or screenshot of the issue faced.</span>
              </li>
            </ol>
          </section>

          {/* Section 5 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">5</span>
              <span>Processing Timelines</span>
            </h2>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Once approved, refunds are credited back to the original payment method (bank account, UPI, card) within <strong>5 to 7 business days</strong> via Razorpay.</span>
            </div>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-3xl border-2 border-[#4029AB]/30 bg-gray-50/80 space-y-4 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">6</span>
              <span>Contact for Refund Inquiries</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              For refund status checks or support:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Legal Name</p>
                <p className="font-bold text-gray-900 text-sm">Pardeep Kumar</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Brand Name</p>
                <p className="font-bold text-[#4029AB] text-sm">Exam Kart</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Refund Support Email</p>
                <a href="mailto:support@exam-kart.com" className="font-bold text-gray-900 text-sm hover:text-[#4029AB] hover:underline flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-[#4029AB]" />
                  <span>support@exam-kart.com</span>
                </a>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Official Website</p>
                <a href="https://bookscircle.org/" target="_blank" rel="noopener noreferrer" className="font-bold text-[#4029AB] text-sm hover:underline flex items-center gap-1.5 mt-0.5">
                  <Globe className="w-3.5 h-3.5 text-[#4029AB]" />
                  <span>https://bookscircle.org/</span>
                </a>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-gray-200 sm:col-span-2">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Office Address</p>
                <p className="font-medium text-gray-800 text-xs sm:text-sm flex items-start gap-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#4029AB] shrink-0 mt-0.5" />
                  <span>1st Floor, SCO-28, Sector 13, Bhiwani, Haryana 127021, India</span>
                </p>
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
