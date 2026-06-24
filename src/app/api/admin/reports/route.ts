import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['ADMIN'])(
  async () => {
    const [reports, total, pending, resolved, falseAlarms] = await Promise.all([
      prisma.reportFlag.findMany({
        orderBy: { created_at: 'desc' },
        include: { reporter: { select: { id: true, name: true, email: true } } },
      }),
      prisma.reportFlag.count(),
      prisma.reportFlag.count({ where: { status: 'PENDING' } }),
      prisma.reportFlag.count({ where: { status: 'RESOLVED' } }),
      prisma.reportFlag.count({ where: { status: 'DISMISSED' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { reports, kpis: { total, pending, resolved, falseAlarms } },
    });
  }
);
