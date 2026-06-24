import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['TENANT'])(
  async (request, _context, user) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') ?? undefined;
    const type = url.searchParams.get('type') ?? undefined;
    const district = url.searchParams.get('district') ?? undefined;
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const pageSize = 12;

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

    const [properties, total, applications] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { images: { where: { is_primary: true }, take: 1 } },
      }),
      prisma.property.count({ where }),
      prisma.application.findMany({
        where: { tenant_id: user.id },
        select: { property_id: true },
      }),
    ]);

    const appliedPropertyIds = new Set(applications.map((a) => a.property_id));

    return NextResponse.json({
      success: true,
      data: {
        properties: properties.map((p) => ({ ...p, has_applied: appliedPropertyIds.has(p.id) })),
        total,
        page,
        pageSize,
      },
    });
  }
);
