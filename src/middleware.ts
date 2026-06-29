import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

const PROTECTED_ROUTES: Record<string, { requiredRole: string; extraGates: string[] }> = {
  '/tenant': { requiredRole: 'TENANT', extraGates: ['ACCOUNT_ACTIVE'] },
  '/landlord': { requiredRole: 'LANDLORD', extraGates: ['ACCOUNT_ACTIVE', 'REGISTRATION_PAID'] },
  '/admin': { requiredRole: 'ADMIN', extraGates: ['TWO_FA_VERIFIED'] },
};

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  if (url.includes('your-project') || anonKey.includes('your-anon-key')) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const pathname = request.nextUrl.pathname;
  const matchedRoute = Object.entries(PROTECTED_ROUTES).find(([prefix]) =>
    pathname.startsWith(prefix)
  );

  // Public routes never need Supabase — let them through untouched so a
  // misconfigured or unreachable Supabase project can't take down the
  // marketing site.
  if (!matchedRoute) {
    return response;
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  const [, config] = matchedRoute;

  let user: any = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request: { headers: request.headers } });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error('[middleware] Supabase auth check failed', error);
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  if (!user) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  const role = user.user_metadata?.role as string;
  if (role !== config.requiredRole) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  const status = user.user_metadata?.status as string;
  if (status === 'BANNED' || status === 'SUSPENDED') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  if (config.extraGates.includes('ACCOUNT_ACTIVE')) {
    if (status === 'PENDING' && pathname !== '/onboarding/account-pending') {
      return NextResponse.redirect(new URL('/onboarding/account-pending', request.url));
    }
  }

  if (config.extraGates.includes('REGISTRATION_PAID')) {
    const kycStatus = user.user_metadata?.kyc_status as string;
    const regPaid = user.user_metadata?.registration_paid as boolean;
    if (kycStatus === 'APPROVED' && !regPaid && pathname !== '/onboarding/payment-required') {
      return NextResponse.redirect(new URL('/onboarding/payment-required', request.url));
    }
  }

  if (config.extraGates.includes('TWO_FA_VERIFIED') && pathname !== '/admin/2fa-challenge') {
    const redisClient = getRedis();
    const twoFaVerified = redisClient ? await redisClient.get(`admin:2fa:${user.id}`) : null;
    if (!twoFaVerified) {
      return NextResponse.redirect(new URL('/admin/2fa-challenge', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};