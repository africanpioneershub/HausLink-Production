import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['LANDLORD'])(
  async (_request, _context, user) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [payments, totalCollected, monthCollected, pendingCount, failedCount] = await Promise.all([
      prisma.payment.findMany({
        where: { landlord_id: user.id },
        orderBy: { created_at: 'desc' },
        include: { tenant: { select: { id: true, name: true, email: true } } },
      }),
      prisma.payment.aggregate({
        where: { landlord_id: user.id, status: 'COMPLETED' },
        _sum: { amount_rwf: true },
      }),
      prisma.payment.aggregate({
        where: { landlord_id: user.id, status: 'COMPLETED', paid_at: { gte: startOfMonth } },
        _sum: { amount_rwf: true },
      }),
      prisma.payment.count({ where: { landlord_id: user.id, status: 'PENDING' } }),
      prisma.payment.count({ where: { landlord_id: user.id, status: 'FAILED' } }),
    ]);

    const kpis = {
      totalCollected: totalCollected._sum.amount_rwf ?? 0,
      thisMonth: monthCollected._sum.amount_rwf ?? 0,
      pending: pendingCount,
      failed: failedCount,
    };

    return NextResponse.json({ success: true, data: { payments, kpis } });
  }
);
