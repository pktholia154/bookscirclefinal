import Link from 'next/link';
import { BookOpen, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#5e17eb]/10 text-[#5e17eb] flex items-center justify-center">
        <BookOpen className="w-8 h-8" />
      </div>
      <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
        Page or E-Book Not Found
      </h1>
      <p className="text-xs sm:text-sm text-gray-500 max-w-sm leading-relaxed">
        The page or study material you are looking for may have been moved, renamed, or updated in our catalog.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5e17eb] text-white text-xs font-bold hover:bg-[#4d0ec5] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-800 text-xs font-bold hover:bg-gray-200 transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Catalog</span>
        </Link>
      </div>
    </div>
  );
}
