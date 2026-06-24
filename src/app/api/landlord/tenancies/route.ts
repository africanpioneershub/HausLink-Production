import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { daysRemaining } from '@/lib/utils';

export const GET = withAuth(['LANDLORD'])(
  async (_request, _context, user) => {
    const [tenancies, totalProperties, occupiedProperties, collectedAggregate] = await Promise.all([
      prisma.tenancy.findMany({
        where: { landlord_id: user.id },
        orderBy: { created_at: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, email: true } },
          property: { select: { id: true, title: true } },
        },
      }),
      prisma.property.count({ where: { landlord_id: user.id } }),
      prisma.property.count({ where: { landlord_id: user.id, status: 'OCCUPIED' } }),
      prisma.payment.aggregate({
        where: { landlord_id: user.id, status: 'COMPLETED' },
        _sum: { amount_rwf: true },
      }),
    ]);

    const derived = tenancies.map((t) => {
      let status: 'ACTIVE' | 'ENDING_SOON' | 'EXPIRED' | 'TERMINATED' = 'ACTIVE';
      if (t.status === 'TERMINATED') {
        status = 'TERMINATED';
      } else {
        const daysLeft = daysRemaining(t.end_date);
        if (daysLeft < 0) status = 'EXPIRED';
        else if (daysLeft <= 30) status = 'ENDING_SOON';
      }
      return { ...t, status };
    });

    const kpis = {
      active: derived.filter((t) => t.status === 'ACTIVE').length,
      endingSoon: derived.filter((t) => t.status === 'ENDING_SOON').length,
      expired: derived.filter((t) => t.status === 'EXPIRED').length,
      terminated: derived.filter((t) => t.status === 'TERMINATED').length,
      totalCollected: collectedAggregate._sum.amount_rwf ?? 0,
      totalProperties,
      occupancyRate:
        totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0,
    };

    return NextResponse.json({ success: true, data: { tenancies: derived, kpis } });
  }
);
