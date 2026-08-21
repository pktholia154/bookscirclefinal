import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, ArrowLeft, Mail, MapPin, Globe, CheckCircle2, ShieldAlert, BookOpen } from 'lucide-react';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'License Agreement | Exam Kart (Legal: Pardeep Kumar) - BooksCircle',
  description: 'Digital Product License Agreement and End User License Agreement (EULA) for e-books purchased from Exam Kart (Legal Name: Pardeep Kumar) on https://bookscircle.org/.',
  alternates: {
    canonical: 'https://bookscircle.org/license-agreement',
  },
};

export default function LicenseAgreementPage() {
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
            <span className="text-xs text-gray-500 font-medium">License Agreement</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full space-y-8">
        {/* Title Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4029AB]/10 text-[#4029AB] text-xs font-bold">
            <Award className="w-4 h-4" />
            <span>Digital Product License & End User Agreement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
            License Agreement
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            This Digital Product License Agreement (&quot;Agreement&quot;) is a binding legal contract between you (&quot;User&quot; or &quot;Licensee&quot;) and <strong className="text-gray-900 font-bold">Exam Kart</strong> (Legal Entity: <strong className="text-gray-900 font-bold">Pardeep Kumar</strong>) regarding all electronic books (e-books), PDF study materials, CSAT guides, and test papers purchased or accessed through <a href="https://bookscircle.org/" className="text-[#4029AB] font-bold hover:underline">https://bookscircle.org/</a>.
          </p>
          <p className="text-[11px] text-gray-400 font-medium pt-1">
            Last Updated: August 2026 • Single-User Educational License
          </p>
        </div>

        {/* License Sections */}
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">1</span>
              <span>Grant of License</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Upon successful payment verification via Razorpay, Exam Kart grants the purchaser a non-exclusive, non-transferable, non-sublicensable, revocable, single-user license to access, view, and read the purchased digital PDF e-book(s) solely for personal educational and preparation use.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">2</span>
              <span>Permitted Uses</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Under this license, you are explicitly permitted to:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700 pt-1 pl-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Read and annotate the e-books on your personal computer, smartphone, or tablet devices.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Cache encrypted copies in your local browser storage for offline access and reading via our web application.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Utilize materials strictly for personal preparation for competitive examinations (e.g., UPSC, SSC, Banking, State PSCs).</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">3</span>
              <span>License Restrictions & Anti-Piracy</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              The following actions constitute copyright infringement and breach of this Agreement:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700 pt-1 pl-2">
              <li className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Distributing, transmitting, renting, sublicensing, broadcasting, or sharing digital copies through Telegram, WhatsApp, cloud drives, torrents, or file hosts.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Removing, altering, or circumventing digital watermarks, security keys, or copyright notices contained within the e-book.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Commercial resale, bundling with third-party coaching courses, or printing for public sale.</span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">4</span>
              <span>Intellectual Property & Ownership</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              All e-books, cover designs, typographical layouts, study notes, mock tests, and questions remain the sole intellectual property of Exam Kart and its authorized content authors. Purchase of a digital copy represents a license to read, not a transfer of copyright or proprietary title.
            </p>
          </section>

          {/* Section 5 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">5</span>
              <span>Termination & Governing Law</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              This license is effective until terminated. Your rights under this Agreement will automatically terminate without notice from Exam Kart if you fail to comply with any terms. Upon termination, you must cease all use and delete all cached copies. This Agreement is governed by the laws of India, under the jurisdiction of courts in <strong className="text-gray-900 font-bold">Bhiwani, Haryana</strong>.
            </p>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-3xl border-2 border-[#4029AB]/30 bg-gray-50/80 space-y-4 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">6</span>
              <span>Licensor Contact Details</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              For license verification, institutional inquiries, or permissions:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Legal Entity</p>
                <p className="font-bold text-gray-900 text-sm">Pardeep Kumar</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Brand Name</p>
                <p className="font-bold text-[#4029AB] text-sm">Exam Kart</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Licensing Email</p>
                <a href="mailto:support@exam-kart.com" className="font-bold text-gray-900 text-sm hover:text-[#4029AB] hover:underline flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-[#4029AB]" />
                  <span>support@exam-kart.com</span>
                </a>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Official Platform</p>
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
