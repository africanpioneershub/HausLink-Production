'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';

export default function AdminTwoFaEnrollPage() {
  const csrf = useCsrf();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!csrf) return;
    fetch('/api/admin/2fa/enroll/start', { method: 'POST', headers: csrfHeaders(csrf) })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setLoadError(json.error ?? 'Failed to start enrollment');
          return;
        }
        setQrCodeDataUrl(json.data.qrCodeDataUrl);
        setSecret(json.data.secret);
      })
      .catch(() => setLoadError('Failed to start enrollment'))
      .finally(() => setLoading(false));
  }, [csrf]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setConfirming(true);

    try {
      const res = await fetch('/api/admin/2fa/enroll/confirm', {
        method: 'POST',
        headers: csrfHeaders(csrf),
        body: JSON.stringify({ code }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error ?? 'Invalid verification code');
        setConfirming(false);
        return;
      }

      router.push('/admin/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setConfirming(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center mb-8">
        <Image src="/logo.png" alt="HausLink" width={180} height={52} className="object-contain mx-auto" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Set Up Two-Factor Authentication
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Scan this code with an authenticator app (Google Authenticator, Authy, 1Password) before continuing.
        </p>

        {loading && <p className="text-sm text-gray-500 text-center py-6">Generating your setup code…</p>}

        {loadError && <p className="text-sm text-red-600 text-center py-6">{loadError}</p>}

        {!loading && !loadError && (
          <>
            <div className="flex justify-center mb-4">
              {qrCodeDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- a data: URL, next/image can't optimize it anyway
                <img src={qrCodeDataUrl} alt="Scan this QR code with your authenticator app" width={200} height={200} />
              )}
            </div>

            <details className="mb-6 text-center">
              <summary className="text-xs text-gray-400 cursor-pointer select-none">
                Can&apos;t scan? Enter this code manually
              </summary>
              <code className="block mt-2 text-xs bg-gray-50 rounded-lg p-2 break-all text-gray-700">{secret}</code>
            </details>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Enter the 6-digit code from your app
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
                disabled={confirming || code.length !== 6 || !csrf}
                className="w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {confirming ? 'Confirming…' : 'Confirm and continue'}
              </button>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
