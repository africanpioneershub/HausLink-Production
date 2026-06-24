import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { daysRemaining } from '@/lib/utils';

export const GET = withAuth(['ADMIN'])(
  async () => {
    const tenancies = await prisma.tenancy.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        landlord: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true } },
      },
    });

    const derived = tenancies.map((t) => {
      const daysLeft = daysRemaining(t.end_date);
      let computedStatus: 'ACTIVE' | 'ENDED' | 'TERMINATED' = 'ACTIVE';
      if (t.status === 'TERMINATED') computedStatus = 'TERMINATED';
      else if (daysLeft < 0) computedStatus = 'ENDED';
      return { ...t, computed_status: computedStatus, days_remaining: daysLeft };
    });

    const kpis = {
      total: derived.length,
      active: derived.filter((t) => t.computed_status === 'ACTIVE').length,
      ended: derived.filter((t) => t.computed_status === 'ENDED').length,
      terminated: derived.filter((t) => t.computed_status === 'TERMINATED').length,
    };

    return NextResponse.json({ success: true, data: { tenancies: derived, kpis } });
  }
);
