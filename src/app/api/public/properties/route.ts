import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { getCache, setCache } from '@/lib/redis/cache';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 12;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') ?? undefined;
  const type = url.searchParams.get('type') ?? undefined;
  const district = url.searchParams.get('district') ?? undefined;
  const minPrice = url.searchParams.get('minPrice');
  const maxPrice = url.searchParams.get('maxPrice');
  const featured = url.searchParams.get('featured');
  const beds = url.searchParams.get('beds');
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE))));

  const cacheKey = `public:properties:${search ?? ''}:${type ?? ''}:${district ?? ''}:${minPrice ?? ''}:${maxPrice ?? ''}:${featured ?? ''}:${beds ?? ''}:${page}:${pageSize}`;
  const fallback = { data: [], total: 0, page, pageSize };

  try {
    const cached = await getCache<{ data: unknown[]; total: number; page: number; pageSize: number }>(
      cacheKey
    );
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }
  } catch (error) {
    console.error('[public/properties] Cache read failed', error);
  }

  const where: Prisma.PropertyWhereInput = { status: 'ACTIVE' };
  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (type) where.type = type;
  if (district) where.district = district;
  if (minPrice || maxPrice) {
    where.rent_rwf = {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {}),
    };
  }
  if (featured === 'true') where.featured = true;
  if (beds && beds !== 'Any') {
    if (beds === '4+') {
      where.bedrooms = { gte: 4 };
    } else {
      where.bedrooms = Number(beds);
    }
  }

  let result;
  try {
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { images: { where: { is_primary: true }, take: 1 } },
      }),
      prisma.property.count({ where }),
    ]);

    const data = properties.map((property) => ({
      id: property.id,
      title: property.title,
      description: property.description,
      type: property.type,
      district: property.district,
      city: property.city,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      rent_rwf: property.rent_rwf,
      view_count: property.view_count,
      is_verified: property.is_verified,
      featured: property.featured,
      imageUrl: property.images[0]?.cdn_url ?? property.images[0]?.storage_path ?? null,
    }));

    result = { data, total, page, pageSize };
  } catch (error) {
    console.error('[public/properties] Database query failed, returning empty result', error);
    return NextResponse.json({ success: true, data: fallback });
  }

  try {
    await setCache(cacheKey, result, CACHE_TTL.PROPERTY_LIST);
  } catch (error) {
    console.error('[public/properties] Cache write failed', error);
  }

  return NextResponse.json({ success: true, data: result });
}
