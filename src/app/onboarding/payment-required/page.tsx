'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { LANDLORD_REGISTRATION_RWF } from '@/lib/constants';
import { formatRwf } from '@/lib/utils';

type PaymentOption = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'STRIPE' | 'BANK_TRANSFER';

const OPTIONS: { id: PaymentOption; label: string }[] = [
  { id: 'MTN_MOMO', label: 'MTN MoMo' },
  { id: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { id: 'STRIPE', label: 'Stripe' },
];

export default function PaymentRequiredPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PaymentOption>('MTN_MOMO');

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center mb-8">
        <span className="text-3xl font-bold text-brand-teal tracking-tight">HausLink</span>
        <span className="mt-1 text-xs font-semibold tracking-widest text-gray-500">
          CONNECT. RENT. MANAGE. ALL-IN-ONE.
        </span>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Complete Your Registration
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          A one-time registration fee of{' '}
          <span className="font-semibold text-gray-900">
            {formatRwf(LANDLORD_REGISTRATION_RWF)}
          </span>{' '}
          is required to activate your landlord account.
        </p>

        <div className="flex gap-2 mb-6">
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`flex-1 text-sm font-semibold py-2.5 rounded-lg border transition-colors ${
                selected === option.id
                  ? 'bg-brand-teal text-white border-brand-teal'
                  : 'border-gray-200 text-gray-700 hover:border-brand-teal hover:text-brand-teal'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-lg p-5 text-sm text-gray-700 space-y-3">
          {selected === 'MTN_MOMO' && (
            <>
              <p className="font-semibold text-gray-900">Pay with MTN MoMo</p>
              <p>1. Dial *182*8*1# on your MTN line</p>
              <p>2. Enter merchant code: <span className="font-mono font-semibold">123456</span></p>
              <p>3. Enter amount: {formatRwf(LANDLORD_REGISTRATION_RWF)}</p>
              <p>4. Confirm with your MoMo PIN</p>
            </>
          )}
          {selected === 'AIRTEL_MONEY' && (
            <>
              <p className="font-semibold text-gray-900">Pay with Airtel Money</p>
              <p>1. Dial *182*1# on your Airtel line</p>
              <p>2. Enter merchant code: <span className="font-mono font-semibold">654321</span></p>
              <p>3. Enter amount: {formatRwf(LANDLORD_REGISTRATION_RWF)}</p>
              <p>4. Confirm with your Airtel Money PIN</p>
            </>
          )}
          {selected === 'STRIPE' && (
            <>
              <p className="font-semibold text-gray-900">Pay with Card (Stripe)</p>
              <p>Card payments are coming soon. Please use MTN MoMo, Airtel Money, or bank transfer below in the meantime.</p>
            </>
          )}

          <div className="border-t border-gray-200 pt-3 mt-3">
            <p className="font-semibold text-gray-900 mb-1">Bank Transfer (fallback)</p>
            <p>Bank: Bank of Kigali</p>
            <p>Account Name: HausLink Ltd</p>
            <p>Account Number: 000-123-456-789</p>
            <p>Reference: Your registered email address</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-5 text-center">
          After payment, our team will manually verify and mark your account as paid within
          24 hours.
        </p>

        <button
          onClick={handleLogout}
          className="w-full mt-6 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Log Out
        </button>
      </div>
    </main>
  );
}
