import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] text-[#1E1B18] px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold font-mono text-[#D97706] mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-sm text-[#736E67] mb-6">
          The requested page or resource could not be found in AlphanexAI Studio.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#1E1B18] rounded-lg hover:bg-black transition-colors"
        >
          Return to Studio Home
        </Link>
      </div>
    </div>
  );
}
