import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';

export const POST = withAuth(['ADMIN'])(
  async (request, context, admin) => {
    const { id } = context.params as { id: string };

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (payment.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Only completed payments can be refunded', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    const updated = await prisma.payment.update({ where: { id }, data: { status: 'REFUNDED' } });

    await logAudit({
      action: AUDIT_ACTIONS.PAYMENT_REFUNDED,
      entityType: 'Payment',
      entityId: id,
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
