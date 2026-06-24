import Link from 'next/link';
import { FileText, MessageSquare, Wallet, Wrench } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';
import { KpiCard } from '@/components/shared/KpiCard';
import { formatDate, formatRwf } from '@/lib/utils';

export default async function TenantDashboardPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const [totalApplications, activeMaintenance, pendingPayments, unreadMessages, tenancy] =
    await Promise.all([
      prisma.application.count({ where: { tenant_id: user.id } }),
      prisma.maintenanceRequest.count({
        where: { tenant_id: user.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      prisma.payment.count({ where: { tenant_id: user.id, status: 'PENDING' } }),
      prisma.message.count({
        where: {
          read_at: null,
          sender_id: { not: user.id },
          conversation: { tenant_id: user.id },
        },
      }),
      prisma.tenancy.findFirst({
        where: { tenant_id: user.id, status: 'ACTIVE' },
        include: { property: true, landlord: true },
      }),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="My Applications" value={totalApplications} icon={FileText} colorScheme="teal" />
        <KpiCard label="Maintenance Requests" value={activeMaintenance} icon={Wrench} colorScheme="gold" />
        <KpiCard label="Pending Payments" value={pendingPayments} icon={Wallet} colorScheme="navy" />
        <KpiCard label="Unread Messages" value={unreadMessages} icon={MessageSquare} colorScheme="green" />
      </div>

      {tenancy ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Tenancy</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Property</p>
              <p className="font-medium text-gray-900">{tenancy.property.title}</p>
            </div>
            <div>
              <p className="text-gray-500">Landlord</p>
              <p className="font-medium text-gray-900">{tenancy.landlord.name ?? tenancy.landlord.email}</p>
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
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Tenancy</h2>
          <p className="text-gray-500 mb-5">
            Start by browsing available properties or check your applications.
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
              View Applications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
