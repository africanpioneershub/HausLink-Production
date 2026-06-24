'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminTwoFaChallengePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setVerifying(true);

    try {
      const res = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error ?? 'Invalid verification code');
        setVerifying(false);
        return;
      }

      router.push('/admin/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setVerifying(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center mb-8">
        <Image src="/logo.png" alt="HausLink" width={180} height={52} className="object-contain mx-auto" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Two-Factor Verification
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Enter the 6-digit code to access the admin dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1.5">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-center text-lg tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
              placeholder="------"
            />
          </div>

          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {verifying ? 'Verifying…' : 'Verify'}
          </button>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </form>
      </div>
    </main>
  );
}
