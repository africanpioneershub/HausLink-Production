import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Stateless anon-key client for public, unauthenticated auth operations
// (signUp, resend) called from API routes. No cookies, no session
// persistence — this must not be used for anything that needs a session.
let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return client;
}

export const supabasePublicAuth = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
