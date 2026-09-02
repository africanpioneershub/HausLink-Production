import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { prisma } from '@/lib/prisma/client';

// Lets the client decide whether to show the normal 2FA challenge or route
// to enrollment first -- an admin with no totp_enrolled_at yet (including
// every admin that existed before per-admin TOTP replaced the old shared
// ADMIN_OTP_SECRET) has never proven possession of a real authenticator
// app, so they enroll instead of being challenged against nothing.
export const GET = withAuth(['ADMIN'])(
  async (_request, _context, admin) => {
    const user = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { totp_enrolled_at: true },
    });

    return NextResponse.json({
      success: true,
      data: { enrolled: !!user?.totp_enrolled_at },
    });
  }
);
