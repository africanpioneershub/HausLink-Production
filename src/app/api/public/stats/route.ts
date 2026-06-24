import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getCache, setCache } from '@/lib/redis/cache';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'public:stats';

export async function GET() {
  const cached = await getCache<{
    activeListings: number;
    verifiedLandlords: number;
    happyTenants: number;
    districtsCovered: number;
  }>(CACHE_KEY);

  if (cached) {
    return NextResponse.json({ success: true, data: cached });
  }

  const [activeListings, verifiedLandlords, happyTenants, districts] = await Promise.all([
    prisma.property.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'LANDLORD', kyc_status: 'APPROVED' } }),
    prisma.user.count({ where: { role: 'TENANT', status: 'ACTIVE' } }),
    prisma.property.findMany({
      where: { status: 'ACTIVE' },
      select: { district: true },
      distinct: ['district'],
    }),
  ]);

  const data = {
    activeListings,
    verifiedLandlords,
    happyTenants,
    districtsCovered: districts.length,
  };

  await setCache(CACHE_KEY, data, CACHE_TTL.PLATFORM_CONFIG);

  return NextResponse.json({ success: true, data });
}
