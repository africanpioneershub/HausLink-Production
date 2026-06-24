import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';

export const POST = withAuth(['ADMIN'])(
  async (request, context, admin) => {
    const { id } = context.params as { id: string };

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updated = await prisma.property.update({
      where: { id },
      data: { status: 'ACTIVE', is_verified: true },
    });

    await logAudit({
      action: AUDIT_ACTIONS.PROPERTY_APPROVED,
      entityType: 'Property',
      entityId: id,
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
