-- Revokes EXECUTE on public.rls_auto_enable() from PUBLIC/anon/authenticated.
--
-- rls_auto_enable() is a SECURITY DEFINER event-trigger handler (runs as
-- its owner regardless of caller), and was left publicly callable via
-- PostgREST RPC despite existing only to be invoked by its own event
-- trigger. A SECURITY DEFINER function callable by anon/authenticated is a
-- privilege-escalation surface by construction -- whatever it does, it does
-- with the owner's privileges, triggered by an unauthenticated caller.
--
-- Only postgres and service_role need EXECUTE here; the event trigger
-- itself does not go through role-based EXECUTE checks.
--
-- STATUS: already applied directly against the linked production project
-- (utptsrquhrliolnwihzb) via `supabase db query --linked` on 2026-09-02.
-- Verified via pg_proc/aclexplode that only postgres and service_role hold
-- EXECUTE on rls_auto_enable() post-revoke. Kept here as the reproducible
-- record of what ran, and to apply the same fix to any environment this
-- hasn't reached yet (REVOKE on a grant that no longer exists is a no-op).

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
