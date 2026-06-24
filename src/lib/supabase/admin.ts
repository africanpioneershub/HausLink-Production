// SERVER-ONLY — Never import this file in client components or public routes
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazily constructed so importing this module (e.g. during Next.js build-time
// page data collection) never requires the service role key to be present.
let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});