import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['ADMIN'])(
  async (request) => {
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') ?? 'ALL';

    const where: { status?: string } = {};
    if (tab !== 'ALL') where.status = tab;

    const [applications, total, pending, approved, rejected, withdrawn] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { applied_at: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, email: true } },
          landlord: { select: { id: true, name: true, email: true } },
          property: { select: { id: true, title: true } },
        },
      }),
      prisma.application.count(),
      prisma.application.count({ where: { status: 'PENDING' } }),
      prisma.application.count({ where: { status: 'APPROVED' } }),
      prisma.application.count({ where: { status: 'REJECTED' } }),
      prisma.application.count({ where: { status: 'WITHDRAWN' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { applications, kpis: { total, pending, approved, rejected, withdrawn } },
    });
  }
);
