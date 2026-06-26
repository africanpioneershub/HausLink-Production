'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Percent, Receipt, Wallet, XCircle } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate, formatRwf } from '@/lib/utils';

interface AdminPaymentItem {
  id: string;
  amount_rwf: number;
  status: string;
  method: string;
  type: string;
  paid_at: string | null;
  created_at: string;
  tenant: { id: string; name: string | null; email: string };
}

interface ChartPoint {
  month: string;
  revenue: number;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    platformFees: 0,
    feePct: 0.02,
    totalTransactions: 0,
    pendingAmount: 0,
    failedCount24h: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  function loadPayments() {
    fetch('/api/admin/payments')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setPayments(json.data.payments);
          setKpis(json.data.kpis);
          setChart(json.data.chart);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPayments();
  }, []);

  async function handleRefund(id: string) {
    if (!window.confirm('Refund this payment?')) return;
    setRefundingId(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}/refund`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'REFUNDED' } : p)));
      }
    } finally {
      setRefundingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Payments</h1>

      {kpis.failedCount24h > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            {kpis.failedCount24h} payment{kpis.failedCount24h > 1 ? 's' : ''} failed in the last 24
            hours.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Revenue"
          value={formatRwf(kpis.totalRevenue)}
          icon={Wallet}
          colorScheme="teal"
        />
        <KpiCard
          label={`Platform Fees (${(kpis.feePct * 100).toFixed(1).replace(/\.0$/, '')}%)`}
          value={formatRwf(kpis.platformFees)}
          icon={Percent}
          colorScheme="gold"
        />
        <KpiCard label="Total Transactions" value={kpis.totalTransactions} icon={Receipt} colorScheme="navy" />
        <KpiCard
          label="Pending Amount"
          value={formatRwf(kpis.pendingAmount)}
          icon={Clock}
          colorScheme="gold"
        />
        <KpiCard label="Failed Count (24h)" value={kpis.failedCount24h} icon={XCircle} colorScheme="red" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => `RWF ${Number(value).toLocaleString('en-US')}`} />
            <Area type="monotone" dataKey="revenue" stroke="#0D7C6E" fill="#0D7C6E" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading payments…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Tenant</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Amount (RWF)</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-gray-700">{p.tenant.name ?? p.tenant.email}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(p.paid_at ?? p.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatRwf(p.amount_rwf)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                        STATUS_BADGE[p.status]
                      )}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleRefund(p.id)}
                        disabled={refundingId === p.id}
                        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
