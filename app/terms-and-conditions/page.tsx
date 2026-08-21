import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowLeft, Mail, MapPin, Globe, CheckCircle2, AlertOctagon, Scale } from 'lucide-react';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Exam Kart (Legal: Pardeep Kumar) - BooksCircle',
  description: 'Terms of Service and Conditions governing digital e-book purchases on Exam Kart (Legal Name: Pardeep Kumar) at https://bookscircle.org/.',
  alternates: {
    canonical: 'https://bookscircle.org/terms-and-conditions',
  },
};

export default function TermsAndConditionsPage() {
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
            <span className="text-xs text-gray-500 font-medium">Terms of Service</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full space-y-8">
        {/* Title Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4029AB]/10 text-[#4029AB] text-xs font-bold">
            <Scale className="w-4 h-4" />
            <span>Official Razorpay Compliance Policy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
            Terms of Service & Conditions
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Please review the terms governing your use of the <strong className="text-gray-900 font-bold">Exam Kart</strong> platform and digital e-book purchases on <a href="https://bookscircle.org/" className="text-[#4029AB] font-bold hover:underline">https://bookscircle.org/</a>.
          </p>
          <p className="text-[11px] text-gray-400 font-medium pt-1">
            Last Updated: August 2026 • Governing Laws of India
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">1</span>
              <span>Agreement to Terms</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              By accessing <a href="https://bookscircle.org/" className="text-[#4029AB] font-semibold hover:underline">https://bookscircle.org/</a> or using our web application provided by brand <strong className="text-gray-900 font-bold">Exam Kart</strong> (Legal Name: <strong className="text-gray-900 font-bold">Pardeep Kumar</strong>), you agree to be bound by these Terms and Conditions.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">2</span>
              <span>Digital Product License</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              All e-books, competitive exam study materials, CSAT guides, and mock papers purchased on Exam Kart are granted under a personal, non-exclusive, non-transferable license. You may download and view materials on your personal devices for individual study.
            </p>
          </section>

          {/* Section 3 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">3</span>
              <span>Intellectual Property Rights</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              All content, procedural book covers, graphics, layout, software code, and educational content on this platform belong to Exam Kart. All proprietary rights are strictly reserved.
            </p>
          </section>

          {/* Section 4 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">4</span>
              <span>Prohibited Activities</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Users are strictly prohibited from:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700 pt-1 pl-2">
              <li className="flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Redistributing, selling, renting, or broadcasting purchased PDF e-books to third parties.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Attempting to bypass security mechanisms or scrape application content.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Using the service for illegal or unauthorized educational resale.</span>
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">5</span>
              <span>User Accounts</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. Exam Kart is not liable for losses caused by unauthorized account access resulting from user negligence.
            </p>
          </section>

          {/* Section 6 */}
          <section className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">6</span>
              <span>Disclaimers & Governing Law</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Our materials are designed for competitive exam preparation. Exam Kart makes reasonable efforts to ensure accuracy. These terms are governed by the laws of India, with exclusive jurisdiction in <strong className="text-gray-900 font-bold">Bhiwani, Haryana</strong>.
            </p>
          </section>

          {/* Section 7 */}
          <section className="p-6 rounded-3xl border-2 border-[#4029AB]/30 bg-gray-50/80 space-y-4 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#4029AB] text-white flex items-center justify-center text-xs font-bold">7</span>
              <span>Contact Information</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              For questions regarding these terms, please contact us:
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
