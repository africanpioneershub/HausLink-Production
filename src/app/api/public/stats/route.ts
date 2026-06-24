import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getCache, setCache } from '@/lib/redis/cache';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'public:stats';

const FALLBACK_STATS = {
  activeListings: 0,
  verifiedLandlords: 0,
  happyTenants: 0,
  districtsCovered: 0,
};

export async function GET() {
  try {
    const cached = await getCache<typeof FALLBACK_STATS>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }
  } catch (error) {
    console.error('[public/stats] Cache read failed', error);
  }

  let data: typeof FALLBACK_STATS;
  try {
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

    data = {
      activeListings,
      verifiedLandlords,
      happyTenants,
      districtsCovered: districts.length,
    };
  } catch (error) {
    console.error('[public/stats] Database query failed, returning fallback stats', error);
    return NextResponse.json({ success: true, data: FALLBACK_STATS });
  }

  try {
    await setCache(CACHE_KEY, data, CACHE_TTL.PLATFORM_CONFIG);
  } catch (error) {
    console.error('[public/stats] Cache write failed', error);
  }

  return NextResponse.json({ success: true, data });
}
