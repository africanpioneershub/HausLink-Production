import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis/cache';
import type { LandlordDashboardKPIs } from '@/types';

export const GET = withAuth(['LANDLORD'])(
  async (_request, _context, user) => {
    const cacheKey = CACHE_KEYS.landlordDashboard(user.id);
    const cached = await getCache<LandlordDashboardKPIs>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const [
      totalProperties,
      occupiedProperties,
      activeTenants,
      rentAggregate,
      maintenanceOpen,
      pendingApplications,
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
    ]);

    const data: LandlordDashboardKPIs = {
      occupancyRate:
        totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0,
      totalRentThisMonth: rentAggregate._sum.rent_rwf ?? 0,
      activeTenants,
      maintenanceOpen,
      pendingApplications,
    };

    await setCache(cacheKey, data, CACHE_TTL.DASHBOARD_KPIS);

    return NextResponse.json({ success: true, data });
  }
);
