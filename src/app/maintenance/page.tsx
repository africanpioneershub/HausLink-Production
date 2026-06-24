import Link from 'next/link';
import Image from 'next/image';

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6">
        <Image src="/logo.png" alt="HausLink" width={180} height={52} className="object-contain mx-auto" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">We&apos;ll be right back</h1>
        <p className="text-gray-600 mb-6">
          This part of HausLink is temporarily unavailable while we perform maintenance. Please
          check back shortly.
        </p>
        <Link
          href="/"
          className="inline-block w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
