import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

const updateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export const PATCH = withAuth(['LANDLORD'])(
  async (request, context, user) => {
    const { id } = context.params as { id: string };

    const maintenanceRequest = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!maintenanceRequest || maintenanceRequest.landlord_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Request not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        resolved_at: parsed.data.status === 'RESOLVED' ? new Date() : maintenanceRequest.resolved_at,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
