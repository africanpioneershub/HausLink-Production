import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { withAuth } from '@/lib/auth/withAuth';
import { generateAdminTotpSecret, buildOtpAuthUri } from '@/lib/auth/totp';
import { encryptTotpSecret } from '@/lib/auth/totpSecret';
import { prisma } from '@/lib/prisma/client';
import { authRateLimit, applyRateLimit } from '@/lib/redis/ratelimit';

// Generates a new per-admin TOTP secret and stores it PENDING (encrypted,
// totp_enrolled_at left null) -- it only becomes the active 2FA secret once
// POST /api/admin/2fa/enroll/confirm proves the admin actually configured
// their authenticator app with it. Safe to call again for an already-
// enrolled admin (e.g. lost device): this only overwrites the pending
// secret, never the currently-active one, until confirm succeeds.
export const POST = withAuth(['ADMIN'])(
  async (_request, _context, admin) => {
    const { success: withinLimit } = await applyRateLimit(authRateLimit, `2fa-enroll:${admin.id}`);
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please wait a minute and try again.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    const secret = generateAdminTotpSecret();
    const otpauthUri = buildOtpAuthUri(secret, admin.email ?? admin.id);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

    await prisma.user.update({
      where: { id: admin.id },
      data: { totp_secret_encrypted: encryptTotpSecret(secret) },
    });

    return NextResponse.json({
      success: true,
      data: { secret, otpauthUri, qrCodeDataUrl },
    });
  }
);
