import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { updateAppMetadata } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { deleteCache, CACHE_KEYS } from '@/lib/redis/cache';
import { AUDIT_ACTIONS } from '@/lib/constants';
import { sendAccountApprovedEmail } from '@/lib/email/templates';
import { sendWhatsAppAccountApproved } from '@/lib/whatsapp/templates';

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

    await prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });

    await updateAppMetadata(userId, { status: 'ACTIVE' });

    await deleteCache(CACHE_KEYS.userProfile(userId));
    await deleteCache('public:stats');

    await logAudit({
      action: AUDIT_ACTIONS.REGISTRATION_APPROVED,
      entityType: 'User',
      entityId: userId,
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    const role = targetUser.role as 'TENANT' | 'LANDLORD';
    if (targetUser.name) {
      sendAccountApprovedEmail({ name: targetUser.name, email: targetUser.email, role }).catch(
        (error) => console.error('[approve-registration] Email failed', error)
      );
    }
    const whatsappPhone = targetUser.whatsapp ?? targetUser.phone;
    if (whatsappPhone) {
      sendWhatsAppAccountApproved({
        phone: whatsappPhone,
        name: targetUser.name ?? 'there',
        role,
      }).catch((error) => console.error('[approve-registration] WhatsApp failed', error));
    }

    return NextResponse.json({ success: true, data: { userId, status: 'ACTIVE' } });
  }
);
