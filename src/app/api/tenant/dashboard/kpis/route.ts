import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis/cache';
import type { TenantDashboardKPIs } from '@/types';

export const GET = withAuth(['TENANT'])(
  async (_request, _context, user) => {
    const cacheKey = CACHE_KEYS.tenantDashboard(user.id);
    const cached = await getCache<TenantDashboardKPIs>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const [
      totalApplications,
      pendingApplications,
      activeMaintenance,
      pendingPayments,
      unreadMessages,
    ] = await Promise.all([
      prisma.application.count({ where: { tenant_id: user.id } }),
      prisma.application.count({ where: { tenant_id: user.id, status: 'PENDING' } }),
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
    ]);

    const data: TenantDashboardKPIs = {
      totalApplications,
      pendingApplications,
      activeMaintenance,
      pendingPayments,
      unreadMessages,
    };

    await setCache(cacheKey, data, CACHE_TTL.DASHBOARD_KPIS);

    return NextResponse.json({ success: true, data });
  }
);
