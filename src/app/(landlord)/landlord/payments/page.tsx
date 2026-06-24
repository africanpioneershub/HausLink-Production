import { AlertCircle, Calendar, Wallet, XCircle } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate, formatRwf } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const METHOD_BADGE: Record<string, string> = {
  MTN_MOMO: 'bg-yellow-100 text-yellow-700',
  AIRTEL_MONEY: 'bg-red-100 text-red-700',
  STRIPE: 'bg-blue-100 text-blue-700',
  BANK_TRANSFER: 'bg-gray-100 text-gray-700',
};

export default async function LandlordPaymentsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [payments, totalCollected, monthCollected, pendingCount, failedCount] = await Promise.all([
    prisma.payment.findMany({
      where: { landlord_id: user.id },
      orderBy: { created_at: 'desc' },
      include: { tenant: { select: { id: true, name: true, email: true } } },
    }),
    prisma.payment.aggregate({
      where: { landlord_id: user.id, status: 'COMPLETED' },
      _sum: { amount_rwf: true },
    }),
    prisma.payment.aggregate({
      where: { landlord_id: user.id, status: 'COMPLETED', paid_at: { gte: startOfMonth } },
      _sum: { amount_rwf: true },
    }),
    prisma.payment.count({ where: { landlord_id: user.id, status: 'PENDING' } }),
    prisma.payment.count({ where: { landlord_id: user.id, status: 'FAILED' } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Rent Collection</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Collected"
          value={formatRwf(totalCollected._sum.amount_rwf ?? 0)}
          icon={Wallet}
          colorScheme="teal"
        />
        <KpiCard
          label="This Month"
          value={formatRwf(monthCollected._sum.amount_rwf ?? 0)}
          icon={Calendar}
          colorScheme="navy"
        />
        <KpiCard label="Pending" value={pendingCount} icon={AlertCircle} colorScheme="gold" />
        <KpiCard label="Failed" value={failedCount} icon={XCircle} colorScheme="red" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Tenant</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Amount (RWF)</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-gray-700">
                    {payment.tenant.name ?? payment.tenant.email}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(payment.paid_at ?? payment.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatRwf(payment.amount_rwf)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                        METHOD_BADGE[payment.method]
                      )}
                    >
                      {payment.method.replace('_', ' ')}
                    </span>
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
