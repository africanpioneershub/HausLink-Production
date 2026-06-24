'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

export default function AccountPendingPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      setEmail(data.user?.email ?? null);
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
        <div className="mx-auto w-14 h-14 rounded-full bg-brand-teal/10 flex items-center justify-center mb-5">
          <Clock className="w-7 h-7 text-brand-teal" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Account Under Review</h1>
        <p className="text-gray-600 mb-6">
          Your email has been verified! Our admin team is reviewing your account. You will
          receive an email once approved (usually within 24 hours).
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900">{email ?? '—'}</span>
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
