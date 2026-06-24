import { AlertCircle } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';
import { cn, formatDate, formatRwf } from '@/lib/utils';
import { PayRentButton } from '@/components/tenant/PayRentButton';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

export default async function TenantPaymentsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const [activeTenancy, payments] = await Promise.all([
    prisma.tenancy.findFirst({
      where: { tenant_id: user.id, status: 'ACTIVE' },
      include: { property: true },
    }),
    prisma.payment.findMany({
      where: { tenant_id: user.id },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        {activeTenancy && (
          <PayRentButton
            tenancyId={activeTenancy.id}
            propertyTitle={activeTenancy.property.title}
            amount={activeTenancy.rent_rwf}
            initialPhone={(user.user_metadata?.phone as string) ?? undefined}
          />
        )}
      </div>

      {!activeTenancy && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>You don&apos;t have an active tenancy. Payment history below reflects past activity only.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Amount (RWF)</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(payment.paid_at ?? payment.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{payment.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatRwf(payment.amount_rwf)}</td>
                  <td className="px-4 py-3 text-gray-700">{payment.method.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                        STATUS_BADGE[payment.status]
                      )}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {payment.txn_ref ?? payment.invoice_code ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
