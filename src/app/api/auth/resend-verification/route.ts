import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabasePublicAuth } from '@/lib/supabase/publicAuth';
import { serializeAuthError, withAuthRetry } from '@/lib/supabase/authError';
import { authRateLimit, applyRateLimit } from '@/lib/redis/ratelimit';

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success: withinLimit } = await applyRateLimit(authRateLimit, `resend-verification:${ip}`);
  if (!withinLimit) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  try {
    const { error } = await withAuthRetry(() =>
      supabasePublicAuth.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: 'https://hauselink.com/auth/confirm' },
      })
    );

    if (error) {
      console.error('[resend-verification] Supabase resend returned an error', {
        email,
        error: serializeAuthError(error),
      });
      return NextResponse.json(
        { success: false, error: 'Failed to resend verification email. Please try again.', code: 'RESEND_FAILED' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('[resend-verification] Supabase resend threw an exception', {
      email,
      error: serializeAuthError(error),
    });
    return NextResponse.json(
      { success: false, error: 'Failed to reach the authentication service. Please try again.', code: 'AUTH_UNREACHABLE' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
