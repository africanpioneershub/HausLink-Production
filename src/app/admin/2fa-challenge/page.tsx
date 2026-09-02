'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';

export default function AdminTwoFaChallengePage() {
  const csrf = useCsrf();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);

  useEffect(() => {
    // Every admin who existed before per-admin TOTP replaced the old
    // shared ADMIN_OTP_SECRET (and any brand-new admin) starts with no
    // enrolled secret -- route them to enrollment instead of a challenge
    // that has nothing valid to check a code against.
    fetch('/api/admin/2fa/status')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && !json.data.enrolled) {
          router.replace('/admin/2fa-enroll');
          return;
        }
        setCheckingEnrollment(false);
      })
      .catch(() => setCheckingEnrollment(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setVerifying(true);

    try {
      const res = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: csrfHeaders(csrf),
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

  if (checkingEnrollment) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
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
            disabled={verifying || code.length !== 6 || !csrf}
            className="w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {verifying
              ? 'Verifying…'
              : !csrf && code.length === 6
              ? 'Loading…'
              : 'Verify'}
          </button>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </form>
      </div>
    </main>
  );
}
