'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] text-[#1E1B18] px-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
        <p className="text-xs font-mono text-[#736E67] mb-6 bg-red-50 p-3 rounded border border-red-200 break-words">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#1E1B18] rounded-md hover:bg-black transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
