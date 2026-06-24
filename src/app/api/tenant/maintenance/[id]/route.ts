import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

export const GET = withAuth(['TENANT'])(
  async (_request, context, user) => {
    const { id } = context.params as { id: string };

    const maintenanceRequest = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { property: { select: { title: true } } },
    });

    if (!maintenanceRequest || maintenanceRequest.tenant_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Request not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: maintenanceRequest });
  }
);
