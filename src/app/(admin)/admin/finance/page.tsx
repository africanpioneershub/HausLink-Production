'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Percent, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate, formatRwf } from '@/lib/utils';

interface PaymentItem {
  id: string;
  tenant: { id: string; name: string | null; email: string };
  type: string;
  status: string;
  method: string;
  amount_rwf: number;
  paid_at: string | null;
  created_at: string;
}

interface FinanceKpis {
  totalRevenue: number;
  platformFees: number;
  feePct: number;
  totalTransactions: number;
  pendingAmount: number;
  failedCount24h: number;
}

interface ChartPoint {
  month: string;
  revenue: number;
}

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
};

export default function AdminFinancePage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<FinanceKpis>({
    totalRevenue: 0,
    platformFees: 0,
    feePct: 0.02,
    totalTransactions: 0,
    pendingAmount: 0,
    failedCount24h: 0,
  });
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  useEffect(() => {
    fetch('/api/admin/payments')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setKpis(json.data.kpis);
          setChart(json.data.chart);
          setPayments(json.data.payments);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingPayments = payments.filter((p) => p.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance & Revenue</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform financial overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={loading ? '—' : formatRwf(kpis.totalRevenue)}
          icon={Wallet}
          colorScheme="teal"
        />
        <KpiCard
          label={`Platform Fees (${loading ? '—' : Math.round(kpis.feePct * 100)}%)`}
          value={loading ? '—' : formatRwf(kpis.platformFees)}
          icon={Percent}
          colorScheme="gold"
        />
        <KpiCard
          label="Pending Payouts"
          value={loading ? '—' : formatRwf(kpis.pendingAmount)}
          icon={Clock}
          colorScheme="navy"
        />
        <KpiCard
          label="Failed Payments (24h)"
          value={loading ? '—' : kpis.failedCount24h}
          icon={AlertTriangle}
          colorScheme="red"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue — Last 6 Months</h2>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(value) => [`RWF ${Number(value).toLocaleString('en-US')}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#0D7C6E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Payments Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Transactions
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">({kpis.totalTransactions} total)</span>
          )}
        </h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payment transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Tenant</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Type</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Method</th>
                  <th className="text-left py-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.slice(0, 50).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                      {p.paid_at ? formatDate(p.paid_at) : formatDate(p.created_at)}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-900 font-medium">
                      {p.tenant.name ?? p.tenant.email}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 capitalize">
                      {p.type.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-900 text-right font-semibold tabular-nums">
                      {formatRwf(p.amount_rwf)}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 capitalize">
                      {p.method.toLowerCase()}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          'text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full',
                          STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disbursements */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Disbursements</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : pendingPayments.length === 0 ? (
          <p className="text-sm text-gray-500">No pending disbursements.</p>
        ) : (
          <div className="flex items-center gap-6">
            <div>
              <p className="text-3xl font-bold text-gray-900">{pendingPayments.length}</p>
              <p className="text-sm text-gray-500 mt-0.5">Pending payments</p>
            </div>
            <div className="h-10 w-px bg-gray-100" />
            <div>
              <p className="text-3xl font-bold text-gray-900">{formatRwf(kpis.pendingAmount)}</p>
              <p className="text-sm text-gray-500 mt-0.5">Total pending payout to landlords</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
