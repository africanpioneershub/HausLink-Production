import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';

export const POST = withAuth(['ADMIN'])(
  async (request, context, admin) => {
    const { id } = context.params as { id: string };

    const maintenanceRequest = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!maintenanceRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const note = typeof body?.note === 'string' ? body.note : undefined;

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    await logAudit({
      action: AUDIT_ACTIONS.MAINTENANCE_ASSIGNED,
      entityType: 'MaintenanceRequest',
      entityId: id,
      adminId: admin.id,
      userId: maintenanceRequest.tenant_id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      metadata: note ? { note } : undefined,
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
