'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={null}>
      <AuthConfirmContent />
    </Suspense>
  );
}

function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    const code = searchParams.get('code');
    // Supabase's signup confirmation link (generated via signUp() with no
    // client-side PKCE verifier) redirects here with the session in a URL
    // hash fragment (#access_token=...&refresh_token=...&type=signup), not
    // a ?code= query param. useSearchParams() can't see the hash, so it's
    // parsed directly from window.location.hash.
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const hashError = hashParams.get('error_description') ?? hashParams.get('error');

    async function verify() {
      const supabase = createBrowserSupabaseClient();

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus('error');
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setStatus('error');
          return;
        }
      } else {
        if (hashError) console.error('[auth/confirm]', hashError);
        setStatus('error');
        return;
      }

      // Email is now verified and a session is established. Activate the
      // account immediately -- email verification alone is sufficient for
      // full access now (see docs/INCIDENT_LOG.md). This call is a
      // best-effort sync of the status field for dashboards/audit only:
      // Supabase's own confirmed-email-required-to-sign-in check is the
      // real access gate, so a failure here does not block the user or
      // change the "verified" outcome shown below.
      try {
        const csrfRes = await fetch('/api/csrf');
        const { token } = await csrfRes.json();
        const activateRes = await fetch('/api/auth/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': token ?? '' },
        });
        if (!activateRes.ok) {
          console.error('[auth/confirm] Activation failed', await activateRes.json().catch(() => null));
        }
      } catch (activationError) {
        console.error('[auth/confirm] Activation request failed', activationError);
      }

      setStatus('success');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }

    verify();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        {status === 'verifying' && (
          <p className="text-sm text-gray-500">Verifying your email…</p>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Email verified successfully!</h1>
            <p className="text-gray-600">Redirecting you to login…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              This link has expired or is invalid
            </h1>
            <p className="text-gray-600 mb-6">
              Please log in to request a new verification email.
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
