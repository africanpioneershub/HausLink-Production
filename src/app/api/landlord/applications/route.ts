import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['LANDLORD'])(
  async (_request, _context, user) => {
    const applications = await prisma.application.findMany({
      where: { landlord_id: user.id },
      orderBy: { applied_at: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: applications });
  }
);
