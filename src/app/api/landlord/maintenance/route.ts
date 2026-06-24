import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['LANDLORD'])(
  async (_request, _context, user) => {
    const requests = await prisma.maintenanceRequest.findMany({
      where: { landlord_id: user.id },
      orderBy: { created_at: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true } },
      },
    });

    const kpis = {
      total: requests.length,
      open: requests.filter((r) => r.status === 'PENDING').length,
      inProgress: requests.filter((r) => r.status === 'IN_PROGRESS').length,
      resolved: requests.filter((r) => r.status === 'RESOLVED').length,
      emergency: requests.filter(
        (r) => r.priority === 'EMERGENCY' && r.status !== 'RESOLVED' && r.status !== 'CLOSED'
      ).length,
    };

    return NextResponse.json({ success: true, data: { requests, kpis } });
  }
);
