import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { updateAppMetadata } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { deleteCache, CACHE_KEYS } from '@/lib/redis/cache';
import { AUDIT_ACTIONS } from '@/lib/constants';
import { sendAccountRejectedEmail } from '@/lib/email/templates';
import { sendWhatsAppAccountRejected } from '@/lib/whatsapp/templates';

export const POST = withAuth(['ADMIN'])(
  async (request, context, admin) => {
    const { userId } = context.params as { userId: string };

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason : undefined;
    const rejectionReason = reason ?? 'Registration could not be approved';

    await prisma.user.update({ where: { id: userId }, data: { status: 'REJECTED' } });

    await updateAppMetadata(userId, { status: 'REJECTED' });

    await deleteCache(CACHE_KEYS.userProfile(userId));

    await logAudit({
      action: AUDIT_ACTIONS.REGISTRATION_REJECTED,
      entityType: 'User',
      entityId: userId,
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      metadata: reason ? { reason } : undefined,
    });

    if (targetUser.name) {
      sendAccountRejectedEmail({
        name: targetUser.name,
        email: targetUser.email,
        reason: rejectionReason,
      }).catch((error) => console.error('[reject-registration] Email failed', error));
    }
    const whatsappPhone = targetUser.whatsapp ?? targetUser.phone;
    if (whatsappPhone) {
      sendWhatsAppAccountRejected({
        phone: whatsappPhone,
        name: targetUser.name ?? 'there',
        reason: rejectionReason,
      }).catch((error) => console.error('[reject-registration] WhatsApp failed', error));
    }

    return NextResponse.json({ success: true, data: { userId, status: 'REJECTED' } });
  }
);
