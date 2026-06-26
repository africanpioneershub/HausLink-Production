import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['ADMIN'])(
  async () => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const [payments, totalRevenueAgg, pendingAgg, totalTransactions, failedCount24h, chartPayments] =
      await Promise.all([
        prisma.payment.findMany({
          orderBy: { created_at: 'desc' },
          take: 100,
          include: { tenant: { select: { id: true, name: true, email: true } } },
        }),
        prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount_rwf: true } }),
        prisma.payment.aggregate({ where: { status: 'PENDING' }, _sum: { amount_rwf: true } }),
        prisma.payment.count(),
        prisma.payment.count({ where: { status: 'FAILED', created_at: { gte: since24h } } }),
        prisma.payment.findMany({
          where: { status: 'COMPLETED', paid_at: { gte: sixMonthsAgo } },
          select: { amount_rwf: true, paid_at: true },
        }),
      ]);

    const totalRevenue = totalRevenueAgg._sum.amount_rwf ?? 0;
    const config = await prisma.platformConfig.findFirst();
    const feePct = config?.transaction_fee_pct ? Number(config.transaction_fee_pct) : 0.02;
    const platformFees = Math.round(Number(totalRevenue) * feePct);

    const monthlyRevenue = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      monthlyRevenue.set(d.toLocaleDateString('en-US', { month: 'short' }), 0);
    }
    for (const p of chartPayments) {
      if (!p.paid_at) continue;
      const key = p.paid_at.toLocaleDateString('en-US', { month: 'short' });
      monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + p.amount_rwf);
    }

    return NextResponse.json({
      success: true,
      data: {
        payments,
        kpis: {
          totalRevenue,
          platformFees,
          feePct,
          totalTransactions,
          pendingAmount: pendingAgg._sum.amount_rwf ?? 0,
          failedCount24h,
        },
        chart: Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({ month, revenue })),
      },
    });
  }
);
