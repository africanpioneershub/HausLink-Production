import { Building2, FileText, Users, Wallet, Wrench } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';
import { KpiCard } from '@/components/shared/KpiCard';
import { formatDate, formatRwf } from '@/lib/utils';

export default async function LandlordDashboardPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    totalProperties,
    occupiedProperties,
    activeTenants,
    rentAggregate,
    maintenanceOpen,
    pendingApplications,
    recentMaintenance,
    upcomingPayments,
  ] = await Promise.all([
    prisma.property.count({ where: { landlord_id: user.id } }),
    prisma.property.count({ where: { landlord_id: user.id, status: 'OCCUPIED' } }),
    prisma.tenancy.count({ where: { landlord_id: user.id, status: 'ACTIVE' } }),
    prisma.tenancy.aggregate({
      where: { landlord_id: user.id, status: 'ACTIVE' },
      _sum: { rent_rwf: true },
    }),
    prisma.maintenanceRequest.count({
      where: { landlord_id: user.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    }),
    prisma.application.count({ where: { landlord_id: user.id, status: 'PENDING' } }),
    prisma.maintenanceRequest.findMany({
      where: { landlord_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { property: true },
    }),
    prisma.payment.findMany({
      where: { landlord_id: user.id, status: 'PENDING' },
      orderBy: { created_at: 'asc' },
      take: 5,
      include: { tenant: true },
    }),
  ]);

  const occupancyRate =
    totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;
  const totalRentThisMonth = rentAggregate._sum.rent_rwf ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Occupancy Rate" value={`${occupancyRate}%`} icon={Building2} colorScheme="teal" />
        <KpiCard
          label="Total Rent This Month"
          value={formatRwf(totalRentThisMonth)}
          icon={Wallet}
          colorScheme="gold"
        />
        <KpiCard label="Active Tenants" value={activeTenants} icon={Users} colorScheme="navy" />
        <KpiCard label="Maintenance Requests" value={maintenanceOpen} icon={Wrench} colorScheme="red" />
        <KpiCard label="Pending Applications" value={pendingApplications} icon={FileText} colorScheme="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Maintenance</h2>
          {recentMaintenance.length === 0 ? (
            <p className="text-sm text-gray-500">No maintenance requests yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentMaintenance.map((req) => (
                <li key={req.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{req.title}</p>
                    <p className="text-gray-500">{req.property.title}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {req.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Schedule</h2>
          {upcomingPayments.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming payments.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingPayments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">
                      {payment.tenant.name ?? payment.tenant.email}
                    </p>
                    <p className="text-gray-500">{formatDate(payment.created_at)}</p>
                  </div>
                  <span className="font-medium text-gray-900">{formatRwf(payment.amount_rwf)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
