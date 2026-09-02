import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { updateAppMetadata } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import { logAudit } from '@/lib/audit/logger';
import { deleteCache, CACHE_KEYS } from '@/lib/redis/cache';
import { AUDIT_ACTIONS } from '@/lib/constants';

// Called by /auth/confirm right after a user establishes a session via
// email confirmation. Email verification alone is now sufficient for full
// access (see docs/INCIDENT_LOG.md) -- Supabase's own "email must be
// confirmed to sign in" check is the real access gate. This route's job is
// to keep the status field in sync for admin dashboards/audit/reporting,
// not to gate anything itself: withAuth already rejects BANNED/SUSPENDED
// users before this handler runs, and a PENDING user who somehow reaches
// here with a confirmed email is exactly who this activates.
export const POST = withAuth(['TENANT', 'LANDLORD'])(
  async (_request, _context, user) => {
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { success: false, error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' },
        { status: 400 }
      );
    }

    const currentStatus = user.app_metadata?.status as string | undefined;
    if (currentStatus !== 'PENDING') {
      // Already active (or some other state withAuth already let through) --
      // nothing to do, and never overwrite a status we didn't set PENDING.
      return NextResponse.json({ success: true, data: { status: currentStatus ?? 'UNKNOWN' } });
    }

    try {
      await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } });
      await updateAppMetadata(user.id, { status: 'ACTIVE' });
    } catch (error) {
      console.error('[activate] Failed to activate user after email confirmation', {
        userId: user.id,
        error,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to activate account. Please try again.', code: 'ACTIVATION_FAILED' },
        { status: 500 }
      );
    }

    await deleteCache(CACHE_KEYS.userProfile(user.id));
    await deleteCache('public:stats');

    await logAudit({
      action: AUDIT_ACTIONS.ACCOUNT_ACTIVATED,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: { status: 'ACTIVE' } });
  }
);
