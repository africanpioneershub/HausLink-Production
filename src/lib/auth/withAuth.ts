import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/types';
import { isAdminIpAllowed } from '@/lib/admin-guard';

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

        const role = user.user_metadata?.role as UserRole;

        if (!allowedRoles.includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Forbidden', code: 'WRONG_ROLE' },
            { status: 403 }
          );
        }

        const status = user.user_metadata?.status as string;
        if (status === 'BANNED' || status === 'SUSPENDED') {
          return NextResponse.json(
            { success: false, error: 'Account suspended', code: 'BANNED' },
            { status: 403 }
          );
        }

        if (role === 'ADMIN') {
          const ip = (request as Request & { headers: Headers }).headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
          if (!isAdminIpAllowed(ip)) {
            return NextResponse.json(
              { success: false, error: 'Forbidden', code: 'IP_NOT_ALLOWED' },
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