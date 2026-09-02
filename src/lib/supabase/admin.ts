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

// Authorization state (role/status/kyc_status/registration_paid) must live in
// app_metadata, never user_metadata -- app_metadata is only writable via this
// service-role client, whereas user_metadata is writable by any authenticated
// user via their own session (auth.updateUser({ data: {...} })). This helper
// centralizes the read-merge-write so every call site stays consistent: fetch
// the current app_metadata, merge the patch over it, write it back. Never use
// updateUserById({ user_metadata }) for these four fields.
export async function updateAppMetadata(
  userId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { ...data.user?.app_metadata, ...patch },
  });
}