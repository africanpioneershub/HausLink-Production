import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { daysRemaining } from '@/lib/utils';

export const GET = withAuth(['TENANT'])(
  async (_request, _context, user) => {
    const tenancy = await prisma.tenancy.findFirst({
      where: { tenant_id: user.id },
      orderBy: { created_at: 'desc' },
      include: {
        property: true,
        landlord: { select: { id: true, name: true } },
      },
    });

    if (!tenancy) {
      return NextResponse.json({ success: true, data: null });
    }

    let status: 'ACTIVE' | 'ENDING_SOON' | 'EXPIRED' | 'TERMINATED' = 'ACTIVE';
    if (tenancy.status === 'TERMINATED') {
      status = 'TERMINATED';
    } else {
      const daysLeft = daysRemaining(tenancy.end_date);
      if (daysLeft < 0) status = 'EXPIRED';
      else if (daysLeft <= 30) status = 'ENDING_SOON';
    }

    return NextResponse.json({
      success: true,
      data: { ...tenancy, status },
    });
  }
);
