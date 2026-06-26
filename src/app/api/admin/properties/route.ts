import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

const VALID_STATUSES = ['PENDING_APPROVAL', 'ACTIVE', 'OCCUPIED', 'INACTIVE', 'DRAFT'];

export const GET = withAuth(['ADMIN'])(
  async (request) => {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status') ?? 'PENDING_APPROVAL';
    const where = statusParam === 'ALL' || !VALID_STATUSES.includes(statusParam)
      ? {}
      : { status: statusParam };

    const [properties, pendingCount, totalProperties] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { landlord: { select: { id: true, name: true, email: true } } },
      }),
      prisma.property.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.property.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        properties,
        kpis: { pendingProperties: pendingCount, totalProperties },
      },
    });
  }
);
