import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';
import { cn, daysRemaining, formatDate, formatRwf } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ENDING_SOON: 'bg-yellow-100 text-yellow-700',
  EXPIRED: 'bg-red-100 text-red-700',
  TERMINATED: 'bg-gray-100 text-gray-700',
};

export default async function TenantTenancyPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const tenancy = await prisma.tenancy.findFirst({
    where: { tenant_id: user.id },
    orderBy: { created_at: 'desc' },
    include: {
      property: true,
      landlord: { select: { id: true, name: true } },
    },
  });

  let status: 'ACTIVE' | 'ENDING_SOON' | 'EXPIRED' | 'TERMINATED' = 'ACTIVE';
  if (tenancy) {
    if (tenancy.status === 'TERMINATED') {
      status = 'TERMINATED';
    } else {
      const daysLeft = daysRemaining(tenancy.end_date);
      if (daysLeft < 0) status = 'EXPIRED';
      else if (daysLeft <= 30) status = 'ENDING_SOON';
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Tenancy</h1>

      {!tenancy ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Tenancy</h2>
          <p className="text-gray-500 mb-5">
            You don&apos;t have a tenancy yet. Browse properties or check the status of your applications.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/tenant/properties"
              className="bg-brand-teal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Browse Properties
            </Link>
            <Link
              href="/tenant/applications"
              className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Check Applications
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{tenancy.property.title}</h2>
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                STATUS_BADGE[status]
              )}
            >
              {status.replace('_', ' ')}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Address</p>
              <p className="font-medium text-gray-900">
                {tenancy.property.district}, {tenancy.property.city}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Landlord</p>
              <p className="font-medium text-gray-900">{tenancy.landlord.name ?? 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-500">Lease Period</p>
              <p className="font-medium text-gray-900">
                {formatDate(tenancy.start_date)} – {formatDate(tenancy.end_date)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Monthly Rent</p>
              <p className="font-medium text-gray-900">{formatRwf(tenancy.rent_rwf)}</p>
            </div>
            <div>
              <p className="text-gray-500">Security Deposit</p>
              <p className="font-medium text-gray-900">{formatRwf(tenancy.deposit_rwf)}</p>
            </div>
            {tenancy.termination_reason && (
              <div>
                <p className="text-gray-500">Termination Reason</p>
                <p className="font-medium text-gray-900">{tenancy.termination_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
