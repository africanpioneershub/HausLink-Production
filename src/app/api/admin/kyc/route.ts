import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

const STATUS_MAP: Record<string, string> = {
  PENDING: 'PENDING',
  VERIFIED: 'APPROVED',
  REJECTED: 'REJECTED',
};

export const GET = withAuth(['ADMIN'])(
  async (request) => {
    const url = new URL(request.url);
    const filter = url.searchParams.get('status') ?? 'ALL';

    const where: Prisma.UserWhereInput = {};
    if (filter !== 'ALL' && STATUS_MAP[filter]) {
      where.kyc_status = STATUS_MAP[filter];
    }

    const [users, pendingVerification, verifiedUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { kyc_documents: { orderBy: { submitted_at: 'desc' } } },
      }),
      prisma.user.count({ where: { kyc_status: 'PENDING' } }),
      prisma.user.count({ where: { kyc_status: 'APPROVED' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { users, kpis: { pendingVerification, verifiedUsers } },
    });
  }
);
