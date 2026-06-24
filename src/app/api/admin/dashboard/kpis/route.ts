import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis/cache';
import type { AdminDashboardKPIs } from '@/types';

interface AdminKpiRow {
  total_users: number;
  total_properties: number;
  platform_revenue_rwf: number;
  pending_kyc: number;
  pending_applications: number;
  failed_payments: number;
}

export const GET = withAuth(['ADMIN'])(
  async () => {
    const cacheKey = CACHE_KEYS.adminDashboardKpis();
    const cached = await getCache<AdminDashboardKPIs>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const rows = await prisma.$queryRaw<AdminKpiRow[]>`SELECT * FROM get_admin_dashboard_kpis()`;
    const row = rows[0];

    const data: AdminDashboardKPIs = {
      totalUsers: Number(row.total_users),
      totalProperties: Number(row.total_properties),
      platformRevenueRwf: Number(row.platform_revenue_rwf),
      pendingKYC: Number(row.pending_kyc),
      pendingApplications: Number(row.pending_applications),
      failedPayments: Number(row.failed_payments),
    };

    await setCache(cacheKey, data, CACHE_TTL.DASHBOARD_KPIS);

    return NextResponse.json({ success: true, data });
  }
);
