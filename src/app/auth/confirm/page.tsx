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

    async function verify() {
      if (!code) {
        setStatus('error');
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setStatus('error');
        return;
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
