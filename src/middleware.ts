import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_ROUTES: Record<string, { requiredRole: string; extraGates: string[] }> = {
  '/tenant': { requiredRole: 'TENANT', extraGates: [] },
  '/landlord': { requiredRole: 'LANDLORD', extraGates: ['KYC_APPROVED', 'REGISTRATION_PAID'] },
  '/admin': { requiredRole: 'ADMIN', extraGates: ['TWO_FA_VERIFIED'] },
};

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

  if (config.extraGates.includes('KYC_APPROVED')) {
    const kycStatus = user.user_metadata?.kyc_status as string;
    if (kycStatus !== 'APPROVED') {
      return NextResponse.redirect(new URL('/onboarding/kyc-pending', request.url));
    }
  }

  if (config.extraGates.includes('REGISTRATION_PAID')) {
    const regPaid = user.user_metadata?.registration_paid as boolean;
    if (!regPaid) {
      return NextResponse.redirect(new URL('/onboarding/payment-required', request.url));
    }
  }

  if (config.extraGates.includes('TWO_FA_VERIFIED')) {
    const twoFa = user.user_metadata?.two_fa_verified as boolean;
    if (!twoFa) {
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