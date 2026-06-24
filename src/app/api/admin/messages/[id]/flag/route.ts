import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';

export const POST = withAuth(['ADMIN'])(
  async (request, context, admin) => {
    const { id } = context.params as { id: string };

    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason : undefined;
    const isFlagging = !conversation.flagged_at;

    const updated = await prisma.conversation.update({
      where: { id },
      data: isFlagging
        ? { flagged_at: new Date(), flagged_reason: reason ?? 'Flagged by admin' }
        : { flagged_at: null, flagged_reason: null },
    });

    await logAudit({
      action: AUDIT_ACTIONS.MESSAGE_FLAGGED,
      entityType: 'Conversation',
      entityId: id,
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      metadata: { flagged: isFlagging, reason },
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
