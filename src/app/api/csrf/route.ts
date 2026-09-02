import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/csrf';
import { SECURITY } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// CSRF tokens are session-bound (see lib/csrf.ts), so minting one requires
// a real session -- unauthenticated callers get nothing to mint against.
// Every route that actually checks a CSRF token (withAuth's CSRF_METHODS
// block) already requires authentication first, so this was never usable
// by an unauthenticated caller anyway.
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'NO_SESSION' },
      { status: 401 }
    );
  }

  const token = generateCsrfToken(user.id);
  const response = NextResponse.json({ token });
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // must be readable by client JS to echo back as the x-csrf-token header
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SECURITY.CSRF_TOKEN_TTL_SECONDS,
  });

  return response;
}
