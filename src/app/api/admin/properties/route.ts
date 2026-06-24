import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['ADMIN'])(
  async () => {
    const [pendingProperties, totalProperties] = await Promise.all([
      prisma.property.findMany({
        where: { status: 'PENDING_APPROVAL' },
        orderBy: { created_at: 'desc' },
        include: { landlord: { select: { id: true, name: true, email: true } } },
      }),
      prisma.property.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        properties: pendingProperties,
        kpis: { pendingProperties: pendingProperties.length, totalProperties },
      },
    });
  }
);
