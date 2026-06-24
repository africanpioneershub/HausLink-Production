'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { formatDate } from '@/lib/utils';

export default function KycPendingPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      const user = data.user;
      if (user) {
        setEmail(user.email ?? null);
        setSubmittedAt(user.user_metadata?.kyc_submitted_at ?? user.created_at ?? null);
      }
    });
  }, []);

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center mb-8">
        <Image src="/logo.png" alt="HausLink" width={180} height={52} className="object-contain mx-auto" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Your account is under review</h1>
        <p className="text-gray-600 mb-6">
          Our team is reviewing your identity documents. This typically takes 24-48 hours.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900">{email ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Submitted</span>
            <span className="font-medium text-gray-900">
              {submittedAt ? formatDate(submittedAt) : '—'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/contact"
            className="w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Contact Support
          </Link>
          <button
            onClick={handleLogout}
            className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </main>
  );
}
