import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['TENANT'])(
  async (_request, _context, user) => {
    const payments = await prisma.payment.findMany({
      where: { tenant_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ success: true, data: payments });
  }
);
