'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { UserRole, KYCStatus, UserStatus } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  kyc_status: KYCStatus;
  registration_paid: boolean;
  name?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

   supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
  const user = data.user;
      if (user) {
        setUser({
          id: user.id,
          email: user.email!,
          role: user.user_metadata?.role as UserRole,
          status: user.user_metadata?.status as UserStatus,
          kyc_status: user.user_metadata?.kyc_status as KYCStatus,
          registration_paid: user.user_metadata?.registration_paid ?? false,
          name: user.user_metadata?.name,
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            role: session.user.user_metadata?.role as UserRole,
            status: session.user.user_metadata?.status as UserStatus,
            kyc_status: session.user.user_metadata?.kyc_status as KYCStatus,
            registration_paid: session.user.user_metadata?.registration_paid ?? false,
            name: session.user.user_metadata?.name,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, isAuthenticated: !!user };
}