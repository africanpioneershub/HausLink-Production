import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex flex-col items-center mb-8">
        <Image src="/logo.png" alt="HausLink" width={180} height={52} className="object-contain mx-auto" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">404 — Page Not Found</h1>
      <p className="text-gray-600 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>

      <Link
        href="/"
        className="bg-brand-teal text-white font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
      >
        Go to Homepage
      </Link>
    </main>
  );
}
