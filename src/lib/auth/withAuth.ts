import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/types';
import { isAdminIpAllowed } from '@/lib/admin-guard';
import { validateCsrfToken, getCookieValue, CSRF_COOKIE_NAME } from '@/lib/csrf';
import { redis } from '@/lib/redis/client';

const CSRF_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

type AuthedHandler = (
  request: Request,
  context: any,
  user: any
) => Promise<Response>;

export function withAuth(allowedRoles: UserRole[]) {
  return function (handler: AuthedHandler) {
    return async function (request: Request, context?: any) {
      try {
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

        // role/status come from app_metadata, never user_metadata --
        // app_metadata is writable only via the service-role admin client;
        // user_metadata is writable by the user themselves from their own
        // session, which previously let a banned user self-unban.
        const role = user.app_metadata?.role as UserRole;

        if (!allowedRoles.includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Forbidden', code: 'WRONG_ROLE' },
            { status: 403 }
          );
        }

        const status = user.app_metadata?.status as string;
        if (status === 'BANNED' || status === 'SUSPENDED') {
          return NextResponse.json(
            { success: false, error: 'Account suspended', code: 'BANNED' },
            { status: 403 }
          );
        }

        if (role === 'ADMIN') {
          // The 2FA verify route, and the routes that bootstrap 2FA itself
          // (checking enrollment status, enrolling a new TOTP secret,
          // confirming enrollment), are exempt: these ARE the ceremony that
          // establishes the admin session, so gating them behind an IP
          // check or an already-verified 2FA session creates a
          // chicken-and-egg lockout. They're already protected by Supabase
          // auth + TOTP code + rate limiting. All other admin routes keep
          // the IP gate.
          const url = new URL(request.url);
          const TWO_FA_BOOTSTRAP_ROUTES = new Set([
            '/api/admin/2fa/verify',
            '/api/admin/2fa/status',
            '/api/admin/2fa/enroll/start',
            '/api/admin/2fa/enroll/confirm',
          ]);
          const is2faBootstrapRoute = TWO_FA_BOOTSTRAP_ROUTES.has(url.pathname);

          if (!is2faBootstrapRoute) {
            const ip = (request as Request & { headers: Headers }).headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
            if (!isAdminIpAllowed(ip)) {
              return NextResponse.json(
                { success: false, error: 'Forbidden', code: 'IP_NOT_ALLOWED' },
                { status: 403 }
              );
            }

            // Mirror the 2FA gate that middleware enforces for /admin/* UI routes.
            // Without this, /api/admin/* routes only required role + IP, not 2FA.
            let twoFaVerified: string | null = null;
            try {
              twoFaVerified = await redis.get(`admin:2fa:${user.id}`);
            } catch {
              // Redis unavailable — fail closed rather than granting access.
            }
            if (!twoFaVerified) {
              return NextResponse.json(
                { success: false, error: 'Two-factor authentication required', code: '2FA_REQUIRED' },
                { status: 403 }
              );
            }
          }
        }

        if (CSRF_METHODS.has(request.method?.toUpperCase() ?? '')) {
          const headerToken = request.headers.get('x-csrf-token');
          const cookieToken = getCookieValue(request, CSRF_COOKIE_NAME);
          if (!validateCsrfToken(cookieToken, headerToken, user.id)) {
            return NextResponse.json(
              { success: false, error: 'Invalid or missing CSRF token', code: 'CSRF_INVALID' },
              { status: 403 }
            );
          }
        }

        return handler(request, context, user);
      } catch (error) {
        console.error('[withAuth Error]', error);
        return NextResponse.json(
          { success: false, error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  };
}