import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { verifyAdminOtp } from '@/lib/auth/totp';
import { decryptTotpSecret } from '@/lib/auth/totpSecret';
import { prisma } from '@/lib/prisma/client';
import { setSession, getSession } from '@/lib/redis/session';
import { redis } from '@/lib/redis/client';
import { authRateLimit, applyRateLimit } from '@/lib/redis/ratelimit';

const ADMIN_2FA_TTL = 3600; // 1 hour per-session

export const POST = withAuth(['ADMIN'])(
  async (request, _context, admin) => {
    const { success: withinLimit } = await applyRateLimit(authRateLimit, `2fa:${admin.id}`);
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please wait a minute and try again.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { totp_secret_encrypted: true, totp_enrolled_at: true },
    });

    if (!user?.totp_enrolled_at || !user.totp_secret_encrypted) {
      return NextResponse.json(
        { success: false, error: 'Two-factor authentication is not set up for this account yet', code: 'ENROLLMENT_REQUIRED' },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => null);
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    let secret: string;
    try {
      secret = decryptTotpSecret(user.totp_secret_encrypted);
    } catch (error) {
      console.error('[admin/2fa/verify] Failed to decrypt stored TOTP secret', { adminId: admin.id, error });
      return NextResponse.json(
        { success: false, error: 'Two-factor authentication is misconfigured for this account', code: 'NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    if (!verifyAdminOtp(code, secret)) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code', code: 'INVALID_CODE' },
        { status: 400 }
      );
    }

    const existing = await getSession(admin.id);
    await setSession(admin.id, {
      userId: admin.id,
      role: 'ADMIN',
      kycStatus: existing?.kycStatus ?? 'APPROVED',
      registrationPaid: existing?.registrationPaid ?? true,
      twoFaVerified: true,
    });

    // Store a dedicated per-session 2FA key with a 1-hour TTL.
    // This is the authoritative 2FA check — NOT user_metadata (which was permanent and insecure).
    await redis.set(`admin:2fa:${admin.id}`, '1', { ex: ADMIN_2FA_TTL });

    return NextResponse.json({ success: true, data: { twoFaVerified: true } });
  }
);
