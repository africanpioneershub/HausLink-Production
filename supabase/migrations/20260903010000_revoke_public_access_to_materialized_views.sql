-- Revokes anon/authenticated privileges on the four analytics materialized
-- views (mv_landlord_finance_monthly, mv_platform_revenue_monthly,
-- mv_property_demand_by_city, mv_user_growth_weekly).
--
-- These views were left with a full ALL-PRIVILEGES grant (INSERT, SELECT,
-- UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) to both anon and
-- authenticated -- almost certainly inherited from a blanket
-- `GRANT ALL ON ALL TABLES IN SCHEMA public` at some point, since nothing
-- ever granted them individually. mv_landlord_finance_monthly carries
-- landlord_id plus gross_income_rwf/total_expenses_rwf/net_profit_rwf, so
-- with SELECT included in that grant, anyone holding the public anon key
-- (ships in every browser bundle) could read any landlord's individual
-- monthly income directly via PostgREST, with zero authentication and
-- entirely bypassing the app.
--
-- Confirmed via grep across the codebase that nothing in the live app
-- relies on anon/authenticated to read (or write) these views directly --
-- the only two consumers are src/app/api/landlord/finance/route.ts
-- (withAuth(['LANDLORD'])) and src/app/api/admin/analytics/route.ts
-- (withAuth(['ADMIN'])), and both read via prisma.$queryRaw, which uses
-- Prisma's own DATABASE_URL connection -- a separate trust boundary from
-- Supabase's PostgREST anon/authenticated roles entirely. No
-- supabase.from('mv_...') or other REST-based access exists anywhere.
--
-- STATUS: already applied directly against the linked production project
-- (utptsrquhrliolnwihzb) via `supabase db query --linked` on 2026-09-02.
-- Verified via both pg_class.relacl (aclexplode) and has_table_privilege()
-- that anon/authenticated have zero privileges on all four views
-- post-revoke. Kept here as the reproducible record of what ran, and to
-- apply the same fix to any environment this hasn't reached yet (safe to
-- re-run -- REVOKE on a grant that no longer exists is a no-op).

REVOKE ALL PRIVILEGES ON
  mv_landlord_finance_monthly,
  mv_platform_revenue_monthly,
  mv_property_demand_by_city,
  mv_user_growth_weekly
FROM anon, authenticated;
