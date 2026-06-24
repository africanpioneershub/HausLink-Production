import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { setSession, getSession } from '@/lib/redis/session';

const HARDCODED_OTP = '123456';

export const POST = withAuth(['ADMIN'])(
  async (request, _context, admin) => {
    const body = await request.json().catch(() => null);
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (code !== HARDCODED_OTP) {
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

    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(admin.id);
    await supabaseAdmin.auth.admin.updateUserById(admin.id, {
      user_metadata: { ...authUserData.user?.user_metadata, two_fa_verified: true },
    });

    return NextResponse.json({ success: true, data: { twoFaVerified: true } });
  }
);
