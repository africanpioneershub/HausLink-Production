import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { getClientIp } from '@/lib/admin-guard';
import { updateAppMetadata } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { deleteCache, CACHE_KEYS } from '@/lib/redis/cache';
import { AUDIT_ACTIONS } from '@/lib/constants';
import { sendKYCApprovedEmail } from '@/lib/email/templates';
import { sendWhatsAppKYCApproved } from '@/lib/whatsapp/templates';

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

    // The admin UI only shows Approve/Reject when kyc_status is PENDING --
    // that's a display convenience, not a security boundary. Without this
    // server-side re-check, a direct API call could mark a user APPROVED
    // (the exact field the disbursement gate trusts) without ever having
    // submitted a document for review. The user update's WHERE clause is
    // the actual concurrency guard (same pattern as the application-
    // approval race fix) -- both updates stay in one transaction so a
    // user is never left APPROVED without its documents also flipping.
    let approved = false;
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id: userId, kyc_status: 'PENDING' },
        data: { kyc_status: 'APPROVED' },
      });
      if (count === 0) return;
      approved = true;

      await tx.kYCDocument.updateMany({
        where: { user_id: userId, review_status: 'PENDING' },
        data: {
          review_status: 'APPROVED',
          reviewed_by: admin.id,
          reviewed_at: new Date(),
        },
      });
    });

    if (!approved) {
      return NextResponse.json(
        { success: false, error: 'This user does not have a pending KYC review', code: 'NOT_PENDING' },
        { status: 409 }
      );
    }

    await updateAppMetadata(userId, { kyc_status: 'APPROVED' });

    await deleteCache(CACHE_KEYS.userProfile(userId));
    await deleteCache('public:stats');

    await logAudit({
      action: AUDIT_ACTIONS.KYC_APPROVED,
      entityType: 'User',
      entityId: userId,
      adminId: admin.id,
      ipAddress: getClientIp(request) || undefined,
    });

    if (targetUser.name) {
      sendKYCApprovedEmail({ name: targetUser.name, email: targetUser.email }).catch((error) =>
        console.error('[kyc approve] Email failed', error)
      );
    }
    const whatsappPhone = targetUser.whatsapp ?? targetUser.phone;
    if (whatsappPhone) {
      sendWhatsAppKYCApproved({ phone: whatsappPhone, name: targetUser.name ?? 'there' }).catch(
        (error) => console.error('[kyc approve] WhatsApp failed', error)
      );
    }

    return NextResponse.json({
      success: true,
      data: { userId, kyc_status: 'APPROVED' },
    });
  }
);
