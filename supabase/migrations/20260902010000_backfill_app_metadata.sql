-- Backfills Supabase Auth's app_metadata (role/status/kyc_status/
-- registration_paid) from Prisma's public.users for every existing user,
-- ahead of the app_metadata migration in middleware.ts/withAuth.ts.
--
-- Without this, every existing user's app_metadata has none of these
-- fields (only Supabase's own default provider/providers), so the new
-- app_metadata-only reads would lock every existing account out of every
-- role/status/KYC/payment gate app-wide the moment that code deploys.
--
-- Prisma is the backfill source (not the old user_metadata) because it has
-- never been client-writable, unlike user_metadata -- it's the more
-- trustworthy value to seed the new source of truth from. Purely additive:
-- merges via jsonb `||`, so provider/providers and anything else already
-- in app_metadata are preserved untouched.
--
-- STATUS: already applied directly against the linked production project
-- (utptsrquhrliolnwihzb) via `supabase db query --linked` on 2026-09-02,
-- affecting the 1 user that existed at the time. Kept here as the
-- reproducible record of what ran, and to backfill any environment this
-- hasn't been applied to yet (safe to re-run -- idempotent, since it
-- always recomputes from Prisma's current values).

UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', p.role,
  'status', p.status,
  'kyc_status', p.kyc_status,
  'registration_paid', p.registration_paid
)
FROM public.users p
WHERE u.id::text = p.id;
