'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/logo.png"
          alt="HausLink"
          width={160}
          height={48}
          className="object-contain"
        />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong</h1>
        <p className="text-gray-600 mb-8">
          We encountered an unexpected error. Please try again or contact support if the problem
          persists.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-brand-teal text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Go Home
          </Link>
        </div>

        {error.digest && (
          <p className="text-xs text-gray-400 mt-6">Error ID: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
