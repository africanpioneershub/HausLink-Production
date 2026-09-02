-- Defense-in-depth for the application-approval race fixed in
-- api/landlord/applications/[id]/approve/route.ts. The route-level fix
-- (conditional UPDATE ... WHERE status = 'ACTIVE'/'PENDING' as the actual
-- concurrency guard, relying on Postgres row locking) already closes the
-- race on its own -- these indexes are a second, independent guarantee that
-- catches any *other* code path that might ever create a Tenancy or
-- Application without going through that guarded route.
--
-- These must be PARTIAL unique indexes (scoped to only the "active" rows),
-- not @@unique in schema.prisma: a property legitimately has many Tenancy
-- rows over its lifetime (one per past tenant), just never more than one
-- ACTIVE at a time; the same tenant may legitimately re-apply to a property
-- after a prior application was REJECTED/WITHDRAWN. A plain, unconditional
-- @@unique would incorrectly block both of those. Prisma's schema DSL has
-- no way to express a WHERE-scoped unique index (tracked upstream:
-- prisma/prisma#1900), so this has to be raw SQL.
--
-- Operational note: this project uses `prisma db push`, not tracked
-- migrations. Because schema.prisma cannot represent a partial index, a
-- future `db push` will not know this index exists -- verify it's still
-- present after any future push, or migrate this project to tracked
-- migrations if that becomes a recurring concern.
--
-- STATUS: already applied directly against the linked production project
-- (utptsrquhrliolnwihzb) via `supabase db query --linked` on 2026-09-02.
-- Verified via pg_indexes that both indexes exist post-apply. Kept here as
-- the reproducible record of what ran, and to apply the same fix to any
-- environment this hasn't reached yet (IF NOT EXISTS makes it safe to
-- re-run).

CREATE UNIQUE INDEX IF NOT EXISTS tenancies_one_active_per_property
  ON public.tenancies (property_id)
  WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS applications_one_active_per_tenant_property
  ON public.applications (tenant_id, property_id)
  WHERE status IN ('PENDING', 'REVIEWING');
