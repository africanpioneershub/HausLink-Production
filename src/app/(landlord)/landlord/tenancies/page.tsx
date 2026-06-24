import {
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  Percent,
  Wallet,
  XCircle,
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, daysRemaining, formatDate, formatRwf } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ENDING_SOON: 'bg-yellow-100 text-yellow-700',
  EXPIRED: 'bg-red-100 text-red-700',
  TERMINATED: 'bg-gray-100 text-gray-700',
};

export default async function LandlordTenanciesPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const [tenancies, totalProperties, occupiedProperties, collectedAggregate] = await Promise.all([
    prisma.tenancy.findMany({
      where: { landlord_id: user.id },
      orderBy: { created_at: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true } },
      },
    }),
    prisma.property.count({ where: { landlord_id: user.id } }),
    prisma.property.count({ where: { landlord_id: user.id, status: 'OCCUPIED' } }),
    prisma.payment.aggregate({
      where: { landlord_id: user.id, status: 'COMPLETED' },
      _sum: { amount_rwf: true },
    }),
  ]);

  const derived = tenancies.map((t) => {
    let status: 'ACTIVE' | 'ENDING_SOON' | 'EXPIRED' | 'TERMINATED' = 'ACTIVE';
    if (t.status === 'TERMINATED') {
      status = 'TERMINATED';
    } else {
      const daysLeft = daysRemaining(t.end_date);
      if (daysLeft < 0) status = 'EXPIRED';
      else if (daysLeft <= 30) status = 'ENDING_SOON';
    }
    return { ...t, status };
  });

  const kpis = {
    active: derived.filter((t) => t.status === 'ACTIVE').length,
    endingSoon: derived.filter((t) => t.status === 'ENDING_SOON').length,
    expired: derived.filter((t) => t.status === 'EXPIRED').length,
    terminated: derived.filter((t) => t.status === 'TERMINATED').length,
    totalCollected: collectedAggregate._sum.amount_rwf ?? 0,
    totalProperties,
    occupancyRate:
      totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tenancies</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <KpiCard label="Active" value={kpis.active} icon={CheckCircle2} colorScheme="green" />
        <KpiCard label="Ending Soon" value={kpis.endingSoon} icon={Clock} colorScheme="gold" />
        <KpiCard label="Expired" value={kpis.expired} icon={XCircle} colorScheme="red" />
        <KpiCard label="Terminated" value={kpis.terminated} icon={Ban} colorScheme="navy" />
        <KpiCard
          label="Total Collected"
          value={formatRwf(kpis.totalCollected)}
          icon={Wallet}
          colorScheme="teal"
        />
        <KpiCard
          label="Total Properties"
          value={kpis.totalProperties}
          icon={Building2}
          colorScheme="navy"
        />
        <KpiCard label="Occupancy Rate" value={`${kpis.occupancyRate}%`} icon={Percent} colorScheme="gold" />
      </div>

      {derived.length === 0 ? (
        <p className="text-sm text-gray-500">No tenancies yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {derived.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{t.tenant.name ?? t.tenant.email}</p>
                <p className="text-sm text-gray-500">{t.property.title}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(t.start_date)} – {formatDate(t.end_date)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-900">{formatRwf(t.rent_rwf)}/mo</span>
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                    STATUS_BADGE[t.status]
                  )}
                >
                  {t.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
