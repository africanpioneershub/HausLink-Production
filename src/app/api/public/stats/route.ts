import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getCache, setCache } from '@/lib/redis/cache';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'public:stats';
// Kept far longer than CACHE_KEY so a DB outage can fall back to the last
// real numbers instead of showing fabricated zeros.
const LAST_GOOD_KEY = 'public:stats:last-good';
const LAST_GOOD_TTL = CACHE_TTL.PLATFORM_CONFIG * 24;

type Stats = {
  activeListings: number;
  verifiedLandlords: number;
  happyTenants: number;
  districtsCovered: number;
};

export async function GET() {
  try {
    const cached = await getCache<Stats>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }
  } catch (error) {
    console.error('[public/stats] Cache read failed', error);
  }

  let data: Stats;
  try {
    const [activeListings, verifiedLandlords, happyTenants] = await Promise.all([
      prisma.property.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'LANDLORD', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'TENANT', status: 'ACTIVE' } }),
    ]);

    data = {
      activeListings,
      verifiedLandlords,
      happyTenants,
      // HausLink covers all 30 districts of Rwanda regardless of current listing density.
      districtsCovered: 30,
    };
  } catch (error) {
    console.error('[public/stats] Database query failed', error);

    try {
      const lastGood = await getCache<Stats>(LAST_GOOD_KEY);
      if (lastGood) {
        return NextResponse.json({ success: true, data: lastGood, stale: true });
      }
    } catch (cacheError) {
      console.error('[public/stats] Last-known-good cache read also failed', cacheError);
    }

    return NextResponse.json({ success: false, error: 'STATS_UNAVAILABLE' }, { status: 503 });
  }

  try {
    await setCache(CACHE_KEY, data, CACHE_TTL.PLATFORM_CONFIG);
    await setCache(LAST_GOOD_KEY, data, LAST_GOOD_TTL);
  } catch (error) {
    console.error('[public/stats] Cache write failed', error);
  }

  return NextResponse.json({ success: true, data });
}
