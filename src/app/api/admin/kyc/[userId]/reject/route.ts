import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { getClientIp } from '@/lib/admin-guard';
import { updateAppMetadata } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { deleteCache, CACHE_KEYS } from '@/lib/redis/cache';
import { AUDIT_ACTIONS } from '@/lib/constants';
import { sendKYCRejectedEmail } from '@/lib/email/templates';
import { sendWhatsAppKYCRejected } from '@/lib/whatsapp/templates';

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

    // Same server-side precondition as approve: the admin UI only shows
    // Reject when kyc_status is PENDING, which is a display convenience,
    // not a security boundary. The user update's WHERE clause is the
    // actual concurrency guard.
    let rejected = false;
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id: userId, kyc_status: 'PENDING' },
        data: { kyc_status: 'REJECTED' },
      });
      if (count === 0) return;
      rejected = true;

      await tx.kYCDocument.updateMany({
        where: { user_id: userId, review_status: 'PENDING' },
        data: {
          review_status: 'REJECTED',
          reviewed_by: admin.id,
          reviewed_at: new Date(),
        },
      });
    });

    if (!rejected) {
      return NextResponse.json(
        { success: false, error: 'This user does not have a pending KYC review', code: 'NOT_PENDING' },
        { status: 409 }
      );
    }

    await updateAppMetadata(userId, { kyc_status: 'REJECTED' });

    await deleteCache(CACHE_KEYS.userProfile(userId));

    await logAudit({
      action: AUDIT_ACTIONS.KYC_REJECTED,
      entityType: 'User',
      entityId: userId,
      adminId: admin.id,
      ipAddress: getClientIp(request) || undefined,
      metadata: reason ? { reason } : undefined,
    });

    const rejectionReason = reason ?? 'Documents could not be verified';

    if (targetUser.name) {
      sendKYCRejectedEmail({
        name: targetUser.name,
        email: targetUser.email,
        reason: rejectionReason,
      }).catch((error) => console.error('[kyc reject] Email failed', error));
    }
    const whatsappPhone = targetUser.whatsapp ?? targetUser.phone;
    if (whatsappPhone) {
      sendWhatsAppKYCRejected({
        phone: whatsappPhone,
        name: targetUser.name ?? 'there',
        reason: rejectionReason,
      }).catch((error) => console.error('[kyc reject] WhatsApp failed', error));
    }

    return NextResponse.json({
      success: true,
      data: { userId, kyc_status: 'REJECTED' },
    });
  }
);
