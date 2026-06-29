'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  propertyId: string;
  kycStatus: string;
  initialApplicationStatus: string | null;
}

export function ApplyButton({ propertyId, kycStatus, initialApplicationStatus }: Props) {
  const csrf = useCsrf();
  const [applicationStatus, setApplicationStatus] = useState<string | null>(initialApplicationStatus);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch('/api/tenant/applications', {
        method: 'POST',
        headers: csrfHeaders(csrf),
        body: JSON.stringify({ property_id: propertyId }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Failed to submit application');
      } else {
        setApplicationStatus('PENDING');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setApplying(false);
    }
  }

  if (kycStatus !== 'APPROVED') {
    return (
      <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-800">
            Complete your identity verification to apply
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            {kycStatus === 'PENDING'
              ? 'Your documents are under review. You can apply once verified (24–48 hours).'
              : kycStatus === 'REJECTED'
              ? 'Your verification was rejected. Please resubmit valid documents.'
              : 'Upload a valid ID document to unlock property applications.'}
          </p>
          {kycStatus !== 'PENDING' && (
            <Link
              href="/tenant/settings?tab=verification"
              className="inline-block mt-3 bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Upload Documents
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (applicationStatus) {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">Application submitted</p>
          <p className="text-xs text-green-700 mt-0.5 uppercase tracking-wide">
            Status: {applicationStatus}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button
        onClick={handleApply}
        disabled={applying}
        className="bg-brand-teal text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {applying ? 'Submitting…' : 'Apply Now'}
      </button>
      <p className="text-xs text-gray-400 mt-2">
        Your application will be sent to the landlord for review.
      </p>
    </div>
  );
}
