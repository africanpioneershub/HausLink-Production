-- Closes the payment-initiation race: two concurrent POSTs to
-- /api/payments/initiate for the same tenancy previously both passed the
-- check-then-act "is there already a pending payment" read before either
-- INSERT committed, producing two PENDING payments and two real MoMo/
-- Airtel prompts sent to the tenant's phone.
--
-- Partial, not a plain UNIQUE(tenant_id, tenancy_id, type): a tenant
-- legitimately accumulates many COMPLETED/FAILED payments for the same
-- tenancy over time (one per month) -- only PENDING ones need to be
-- unique at any given moment. Prisma's schema DSL can't express a
-- WHERE-scoped unique index (see the equivalent note in
-- 20260902000000_prevent_double_booking.sql), so this is raw SQL.
--
-- The application code (api/payments/initiate/route.ts) now catches the
-- resulting unique-violation (Prisma P2002) and returns the
-- already-in-flight payment instead of erroring, so a losing concurrent
-- request degrades gracefully rather than 500ing.
--
-- STATUS: already applied directly against the linked production project
-- (utptsrquhrliolnwihzb) via `supabase db query --linked` on 2026-09-02.
-- Verified via pg_indexes that the index exists post-apply. Kept here as
-- the reproducible record of what ran, and to apply the same fix to any
-- environment this hasn't reached yet (IF NOT EXISTS makes it safe to
-- re-run).

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending_per_tenancy_type
  ON public.payments (tenant_id, tenancy_id, type)
  WHERE status = 'PENDING';
