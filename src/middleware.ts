import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_ROUTES: Record<string, { requiredRole: string; extraGates: string[] }> = {
  '/tenant': { requiredRole: 'TENANT', extraGates: [] },
  '/landlord': { requiredRole: 'LANDLORD', extraGates: ['KYC_APPROVED', 'REGISTRATION_PAID'] },
  '/admin': { requiredRole: 'ADMIN', extraGates: ['TWO_FA_VERIFIED'] },
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  for (const [prefix, config] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(prefix)) {
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
          return NextResponse.redirect(
            new URL('/onboarding/kyc-pending', request.url)
          );
        }
      }

      if (config.extraGates.includes('REGISTRATION_PAID')) {
        const regPaid = user.user_metadata?.registration_paid as boolean;
        if (!regPaid) {
          return NextResponse.redirect(
            new URL('/onboarding/payment-required', request.url)
          );
        }
      }

      if (config.extraGates.includes('TWO_FA_VERIFIED')) {
        const twoFa = user.user_metadata?.two_fa_verified as boolean;
        if (!twoFa) {
          return NextResponse.redirect(
            new URL('/admin/2fa-challenge', request.url)
          );
        }
      }

      break;
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};