import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center mb-4 text-2xl font-bold">
        404
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Book or Page Not Found</h1>
      <p className="text-sm text-gray-600 max-w-md mb-6">
        The exam study material or page you are looking for might have been moved or updated.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-[#4029AB] text-white text-sm font-semibold rounded-xl hover:bg-[#321f8a] transition-colors shadow-sm"
      >
        Return to Home Catalog
      </Link>
    </div>
  );
}
