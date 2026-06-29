import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis/cache';
import type { AdminDashboardKPIs } from '@/types';

export const GET = withAuth(['ADMIN'])(
  async () => {
    const cacheKey = CACHE_KEYS.adminDashboardKpis();
    const cached = await getCache<AdminDashboardKPIs>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const oneDayAgo = new Date(Date.now() - 86_400_000);

    const [
      totalUsers,
      totalProperties,
      revenueAgg,
      pendingKYC,
      pendingApplications,
      failedPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.ledgerEntry.aggregate({ _sum: { platform_fee_rwf: true } }),
      prisma.user.count({ where: { kyc_status: 'PENDING' } }),
      prisma.application.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'FAILED', created_at: { gte: oneDayAgo } } }),
    ]);

    const data: AdminDashboardKPIs = {
      totalUsers,
      totalProperties,
      platformRevenueRwf: revenueAgg._sum.platform_fee_rwf ?? 0,
      pendingKYC,
      pendingApplications,
      failedPayments,
    };

    await setCache(cacheKey, data, CACHE_TTL.DASHBOARD_KPIS);

    return NextResponse.json({ success: true, data });
  }
);
