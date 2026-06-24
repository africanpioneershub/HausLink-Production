import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['ADMIN'])(
  async () => {
    const requests = await prisma.maintenanceRequest.findMany({
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

    const byCategory = new Map<string, number>();
    const byPriority = new Map<string, number>();
    for (const r of requests) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
      byPriority.set(r.priority, (byPriority.get(r.priority) ?? 0) + 1);
    }

    return NextResponse.json({
      success: true,
      data: {
        requests,
        kpis,
        byCategory: Array.from(byCategory.entries()).map(([category, count]) => ({ category, count })),
        byPriority: Array.from(byPriority.entries()).map(([priority, count]) => ({ priority, count })),
      },
    });
  }
);
