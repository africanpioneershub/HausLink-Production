import { AlertTriangle, Building2, FileText, ShieldCheck, Users, Wallet } from 'lucide-react';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { KpiCard } from '@/components/shared/KpiCard';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { formatDate, formatRwf } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface AdminKpiRow {
  total_users: number;
  total_properties: number;
  platform_revenue_rwf: number;
  pending_kyc: number;
  pending_applications: number;
  failed_payments: number;
}

export default async function AdminDashboardPage() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  let kpis: AdminKpiRow = {
    total_users: 0,
    total_properties: 0,
    platform_revenue_rwf: 0,
    pending_kyc: 0,
    pending_applications: 0,
    failed_payments: 0,
  };
  let recentPayments: { amount_rwf: number; paid_at: Date | null }[] = [];
  let pendingKycUsers: User[] = [];

  try {
    const [kpiRows, payments, kycUsers] = await Promise.all([
      prisma.$queryRaw<AdminKpiRow[]>`SELECT * FROM get_admin_dashboard_kpis()`,
      prisma.payment.findMany({
        where: { status: 'COMPLETED', paid_at: { gte: sixMonthsAgo } },
        select: { amount_rwf: true, paid_at: true },
      }),
      prisma.user.findMany({
        where: { kyc_status: 'PENDING' },
        orderBy: { created_at: 'asc' },
        take: 5,
      }),
    ]);

    kpis = kpiRows[0] ?? kpis;
    recentPayments = payments;
    pendingKycUsers = kycUsers;
  } catch (error) {
    console.error('[admin/dashboard] DB error:', error);
  }

  const monthlyRevenue = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    monthlyRevenue.set(d.toLocaleDateString('en-US', { month: 'short' }), 0);
  }
  for (const payment of recentPayments) {
    if (!payment.paid_at) continue;
    const key = payment.paid_at.toLocaleDateString('en-US', { month: 'short' });
    monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + payment.amount_rwf);
  }
  const revenueData = Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({
    month,
    revenue,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Total Users" value={Number(kpis.total_users)} icon={Users} colorScheme="teal" />
        <KpiCard
          label="Total Properties"
          value={Number(kpis.total_properties)}
          icon={Building2}
          colorScheme="navy"
        />
        <KpiCard
          label="Platform Revenue"
          value={formatRwf(Number(kpis.platform_revenue_rwf))}
          icon={Wallet}
          colorScheme="gold"
        />
        <KpiCard
          label="Pending Applications"
          value={Number(kpis.pending_applications)}
          icon={FileText}
          colorScheme="green"
        />
        <KpiCard
          label="Pending KYC"
          value={Number(kpis.pending_kyc)}
          icon={ShieldCheck}
          colorScheme="gold"
        />
        <KpiCard
          label="Failed Payments (24h)"
          value={Number(kpis.failed_payments)}
          icon={AlertTriangle}
          colorScheme="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue (Last 6 Months)</h2>
          <RevenueChart data={revenueData} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending KYC Queue</h2>
          {pendingKycUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No pending KYC reviews.</p>
          ) : (
            <ul className="space-y-3">
              {pendingKycUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{u.name ?? u.email}</p>
                    <p className="text-gray-500">{formatDate(u.created_at)}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                    Pending
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
