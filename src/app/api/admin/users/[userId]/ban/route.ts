import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { deleteCache, CACHE_KEYS } from '@/lib/redis/cache';
import { AUDIT_ACTIONS } from '@/lib/constants';

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

    await prisma.user.update({ where: { id: userId }, data: { status: 'BANNED' } });

    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...authUserData.user?.user_metadata, status: 'BANNED' },
    });

    await deleteCache(CACHE_KEYS.userProfile(userId));

    await logAudit({
      action: AUDIT_ACTIONS.USER_BANNED,
      entityType: 'User',
      entityId: userId,
      adminId: admin.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ success: true, data: { userId, status: 'BANNED' } });
  }
);
