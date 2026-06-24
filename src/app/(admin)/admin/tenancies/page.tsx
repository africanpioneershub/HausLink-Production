import { Ban, CheckCircle2, Download, Home, XCircle } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, daysRemaining, formatDate, formatRwf } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ENDED: 'bg-red-100 text-red-700',
  TERMINATED: 'bg-gray-100 text-gray-700',
};

type TenancyWithRelations = Prisma.TenancyGetPayload<{
  include: {
    tenant: { select: { id: true; name: true; email: true } };
    landlord: { select: { id: true; name: true; email: true } };
    property: { select: { id: true; title: true } };
  };
}>;

export default async function AdminTenanciesPage() {
  let tenancies: TenancyWithRelations[] = [];

  try {
    tenancies = await prisma.tenancy.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        landlord: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true } },
      },
    });
  } catch (error) {
    console.error('[admin/tenancies] DB error:', error);
  }

  const derived = tenancies.map((t) => {
    const daysLeft = daysRemaining(t.end_date);
    let computedStatus: 'ACTIVE' | 'ENDED' | 'TERMINATED' = 'ACTIVE';
    if (t.status === 'TERMINATED') computedStatus = 'TERMINATED';
    else if (daysLeft < 0) computedStatus = 'ENDED';
    return { ...t, computed_status: computedStatus, days_remaining: daysLeft };
  });

  const kpis = {
    total: derived.length,
    active: derived.filter((t) => t.computed_status === 'ACTIVE').length,
    ended: derived.filter((t) => t.computed_status === 'ENDED').length,
    terminated: derived.filter((t) => t.computed_status === 'TERMINATED').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tenancies</h1>
        <a
          href="/api/admin/tenancies/export"
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total" value={kpis.total} icon={Home} colorScheme="teal" />
        <KpiCard label="Active" value={kpis.active} icon={CheckCircle2} colorScheme="green" />
        <KpiCard label="Ended" value={kpis.ended} icon={XCircle} colorScheme="red" />
        <KpiCard label="Terminated" value={kpis.terminated} icon={Ban} colorScheme="navy" />
      </div>

      {derived.length === 0 ? (
        <p className="text-sm text-gray-500">No tenancies yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {derived.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{t.tenant.name ?? t.tenant.email}</p>
                <p className="text-sm text-gray-500">
                  {t.property.title} · Landlord: {t.landlord.name ?? t.landlord.email}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(t.start_date)} – {formatDate(t.end_date)} ·{' '}
                  {t.days_remaining >= 0
                    ? `${t.days_remaining} day${t.days_remaining === 1 ? '' : 's'} remaining`
                    : `${Math.abs(t.days_remaining)} day${Math.abs(t.days_remaining) === 1 ? '' : 's'} overdue`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-900">{formatRwf(t.rent_rwf)}/mo</span>
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                    STATUS_BADGE[t.computed_status]
                  )}
                >
                  {t.computed_status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
