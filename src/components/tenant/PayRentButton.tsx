'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn, formatRwf } from '@/lib/utils';

type PaymentMethod = 'MTN_MOMO' | 'AIRTEL_MONEY';
type ModalStatus = 'idle' | 'submitting' | 'instructions' | 'completed' | 'failed' | 'error';

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

interface PayRentButtonProps {
  tenancyId: string;
  propertyTitle: string;
  amount: number;
  initialPhone?: string;
}

function stripCountryCode(phone: string | undefined): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/[^\d]/g, '');
  return digitsOnly.startsWith('250') ? digitsOnly.slice(3) : digitsOnly;
}

export function PayRentButton({ tenancyId, propertyTitle, amount, initialPhone }: PayRentButtonProps) {
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState('+250');
  const [phone, setPhone] = useState(stripCountryCode(initialPhone));
  const [method, setMethod] = useState<PaymentMethod>('MTN_MOMO');
  const [status, setStatus] = useState<ModalStatus>('idle');
  const [error, setError] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  useEffect(() => stopPolling, []);

  function startPolling(id: string) {
    stopPolling();
    pollStartRef.current = Date.now();

    pollTimerRef.current = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
        return;
      }

      try {
        const res = await fetch(`/api/payments/${id}/status`);
        const json = await res.json();
        if (json.success) {
          if (json.data.status === 'COMPLETED') {
            setStatus('completed');
            stopPolling();
          } else if (json.data.status === 'FAILED') {
            setStatus('failed');
            stopPolling();
          }
        }
      } catch {
        // transient network error — keep polling until timeout
      }
    }, POLL_INTERVAL_MS);
  }

  function resetAndClose() {
    stopPolling();
    setOpen(false);
    setStatus('idle');
    setError('');
    setSteps([]);
    setPaymentId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setStatus('submitting');
    setError('');

    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenancyId,
          method,
          phoneNumber: `${countryCode}${phone}`,
          amount,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setStatus('error');
        setError(json.error ?? 'Failed to initiate payment');
        return;
      }

      setPaymentId(json.data.paymentId);
      setSteps(json.data.instructions?.steps ?? []);
      setStatus('instructions');
      startPolling(json.data.paymentId);
    } catch {
      setStatus('error');
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-teal text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Pay Rent
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 relative">
            <button
              onClick={resetAndClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-1">Pay Rent</h2>
            <p className="text-sm text-gray-500 mb-5">{propertyTitle}</p>
            <p className="text-2xl font-bold text-gray-900 mb-5">{formatRwf(amount)}</p>

            {status === 'idle' || status === 'submitting' || status === 'error' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  {(['MTN_MOMO', 'AIRTEL_MONEY'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={cn(
                        'flex-1 text-sm font-semibold py-2.5 rounded-lg border transition-colors',
                        method === m
                          ? 'bg-brand-teal text-white border-brand-teal'
                          : 'border-gray-200 text-gray-700 hover:border-brand-teal hover:text-brand-teal'
                      )}
                    >
                      {m === 'MTN_MOMO' ? 'MTN MoMo' : 'Airtel Money'}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <div className="flex">
                    <input
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-16 px-2 py-2.5 border border-gray-300 rounded-l-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-teal"
                    />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="788123456"
                      inputMode="numeric"
                      className="flex-1 px-4 py-2.5 border border-l-0 border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending payment request...
                    </>
                  ) : (
                    `Pay ${formatRwf(amount)}`
                  )}
                </button>
              </form>
            ) : status === 'instructions' ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-900">
                  Payment request sent to your phone
                </p>
                <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                  {steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="text-xs text-gray-400">Waiting for confirmation…</p>
              </div>
            ) : status === 'completed' ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="font-semibold text-gray-900">Payment confirmed!</p>
                <button
                  onClick={resetAndClose}
                  className="w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </div>
            ) : status === 'failed' ? (
              <div className="text-center space-y-3 py-4">
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="font-semibold text-gray-900">Payment failed</p>
                <p className="text-sm text-gray-500">Please try again.</p>
                <button
                  onClick={resetAndClose}
                  className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : null}

            {paymentId && (status === 'instructions') && (
              <p className="text-[10px] text-gray-300 mt-4 text-center">Reference: {paymentId}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
