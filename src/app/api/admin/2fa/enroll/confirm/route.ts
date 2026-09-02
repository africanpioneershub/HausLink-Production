import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { verifyAdminOtp } from '@/lib/auth/totp';
import { decryptTotpSecret } from '@/lib/auth/totpSecret';
import { prisma } from '@/lib/prisma/client';
import { setSession } from '@/lib/redis/session';
import { redis } from '@/lib/redis/client';
import { authRateLimit, applyRateLimit } from '@/lib/redis/ratelimit';
import { logAudit } from '@/lib/audit/logger';
import { AUDIT_ACTIONS } from '@/lib/constants';

const ADMIN_2FA_TTL = 3600; // 1 hour per-session, matches /api/admin/2fa/verify

// Confirms the admin actually configured their authenticator app with the
// secret enroll/start generated -- only after this succeeds does that
// secret become the ACTIVE one /api/admin/2fa/verify checks future logins
// against. Also establishes the 2FA-verified session immediately, so an
// admin who just enrolled isn't asked to enter a second code right away.
export const POST = withAuth(['ADMIN'])(
  async (request, _context, admin) => {
    const { success: withinLimit } = await applyRateLimit(authRateLimit, `2fa-enroll-confirm:${admin.id}`);
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please wait a minute and try again.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { totp_secret_encrypted: true },
    });

    if (!user?.totp_secret_encrypted) {
      return NextResponse.json(
        { success: false, error: 'No enrollment in progress -- start enrollment first', code: 'NOT_STARTED' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    let secret: string;
    try {
      secret = decryptTotpSecret(user.totp_secret_encrypted);
    } catch (error) {
      console.error('[admin/2fa/enroll/confirm] Failed to decrypt pending TOTP secret', { adminId: admin.id, error });
      return NextResponse.json(
        { success: false, error: 'Enrollment is misconfigured -- please restart it', code: 'NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    if (!verifyAdminOtp(code, secret)) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code', code: 'INVALID_CODE' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: admin.id },
      data: { totp_enrolled_at: new Date() },
    });

    await setSession(admin.id, {
      userId: admin.id,
      role: 'ADMIN',
      kycStatus: 'APPROVED',
      registrationPaid: true,
      twoFaVerified: true,
    });
    await redis.set(`admin:2fa:${admin.id}`, '1', { ex: ADMIN_2FA_TTL });

    await logAudit({
      action: AUDIT_ACTIONS.ADMIN_2FA_ENROLLED,
      entityType: 'User',
      entityId: admin.id,
      adminId: admin.id,
    });

    return NextResponse.json({ success: true, data: { enrolled: true, twoFaVerified: true } });
  }
);
