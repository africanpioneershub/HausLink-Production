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
        { success: false, error: 'Only completed payments can be flagged for refund', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // No MoMo/Airtel reversal call exists in this codebase -- this action
    // must never claim money has actually moved. It records that a refund
    // was requested (blocking disbursement of the matching ledger entry --
    // see disbursement.worker.ts's payment-status check) and leaves the
    // real reversal as a manual step through the provider's own
    // dashboard/support channel until that integration exists.
    // REFUND_REQUESTED is deliberately a different value from REFUNDED, so
    // that string is reserved for when a real, confirmed reversal exists.
    const updated = await prisma.payment.update({ where: { id }, data: { status: 'REFUND_REQUESTED' } });

    await logAudit({
      action: AUDIT_ACTIONS.PAYMENT_REFUNDED,
      entityType: 'Payment',
      entityId: id,
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      metadata: { note: 'Flagged for manual refund -- no automated provider reversal exists yet' },
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
