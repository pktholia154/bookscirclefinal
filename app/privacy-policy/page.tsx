import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Mail, MapPin, Globe, Lock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | Exam Kart (Legal: Pardeep Kumar) - BooksCircle',
  description: 'Privacy Policy for digital e-book purchases on Exam Kart (Legal entity: Pardeep Kumar) at https://bookscircle.org/. Learn how your data is collected and protected.',
  alternates: {
    canonical: 'https://bookscircle.org/privacy-policy',
  },
};

export default function PrivacyPolicyPage() {
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
            <span className="text-xs text-gray-500 font-medium">Privacy Policy</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full space-y-8">
        {/* Title Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4029AB]/10 text-[#4029AB] text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Razorpay Compliance Policy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
            Privacy Policy
          </h1>
          <p className="text-sm font-bold text-gray-700">
            Your Privacy Matters
          </p>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            At <strong className="text-gray-900 font-bold">Exam Kart</strong> (Legal entity:{' '}
            <strong className="text-gray-900 font-bold">Pardeep Kumar</strong>), we prioritize protecting your personal information and ensuring full transparency regarding data collection and usage on our digital e-book platform <a href="https://bookscircle.org/" className="text-[#4029AB] font-bold hover:underline">https://bookscircle.org/</a>.
          </p>
          <p className="text-[11px] text-gray-400 font-medium pt-1">
            Last Updated: August 2026 • Effective Immediately
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">1</span>
              <span>Overview & Information We Collect</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              When you visit or purchase digital e-books on <a href="https://bookscircle.org/" className="text-[#4029AB] font-semibold hover:underline">https://bookscircle.org/</a>, we collect essential information required to deliver services effectively:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700 pt-1 pl-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4029AB] shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 font-bold">Personal Data:</strong> Name, email address, and authentication credentials.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4029AB] shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 font-bold">Transaction Records:</strong> History of purchased e-books, order IDs, and payment statuses.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4029AB] shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 font-bold">Technical Data:</strong> Device type, browser preferences, and local reading progress.</span>
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">2</span>
              <span>How We Use Your Data</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Your information is exclusively utilized for the following purposes:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700 pt-1 pl-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Granting instant, secure access to purchased PDF e-books in your personal digital library.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Preserving reading markers, notes, and offline download progress within the application.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Processing orders and delivering customer support for exam material inquiries.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Sending essential service updates and receipt confirmations.</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">3</span>
              <span>Data Security & Storage</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              We deploy strict security protocols including SSL encryption for data transmission and secure cloud infrastructure. Your purchased e-book library is linked to your authorized credentials to prevent unauthorized access.
            </p>
          </section>

          {/* Section 4 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">4</span>
              <span>Third-Party Services</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              We do not sell, rent, or trade your personal data. Third-party integrations (such as secure authentication and payment processing channels like Razorpay) handle data strictly under confidentiality agreements to complete authorized transactions.
            </p>
          </section>

          {/* Section 5 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">5</span>
              <span>Cookies & Local Storage</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Our web application uses client-side local storage and essential browser cookies to ensure uninterrupted offline access to your downloaded e-books and maintain seamless login sessions.
            </p>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-3xl border-2 border-[#4029AB]/30 bg-gray-50/80 space-y-4 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">6</span>
              <span>Contact & Data Inquiries</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              If you have questions or wish to request data updates/deletion, contact us at:
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
                <p className="text-[10px] text-gray-500 font-bold uppercase">Email Address</p>
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
                <p className="text-[10px] text-gray-500 font-bold uppercase">Registered Office Address</p>
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
