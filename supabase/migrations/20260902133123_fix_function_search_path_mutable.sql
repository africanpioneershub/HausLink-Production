-- Fixes the function_search_path_mutable advisor findings on the linked
-- project (utptsrquhrliolnwihzb / "HausLink Production").
--
-- These 4 functions had no fixed search_path, so their unqualified
-- references (users, properties, payments, applications, the mv_*
-- materialized views) resolved via whatever search_path was in effect at
-- call time -- which a malicious role/session setting could redirect to
-- attacker-controlled objects in another schema. Pinning search_path to
-- 'public, pg_temp' closes that off while preserving existing behavior
-- (all referenced objects already live in public; pg_temp is included so a
-- session's own temp objects still resolve normally, without opening the
-- door to search-path-based schema injection from anywhere else).
--
-- Supersedes the now-deleted 20260901000000_fix_function_search_path_mutable.sql,
-- which targeted the same 4 functions but was written before this was
-- actually applied and used a plain 'public' search_path rather than
-- 'public, pg_temp'. This file matches what's actually live.
--
-- STATUS: already applied directly against the linked production project
-- via `supabase db query --linked` on 2026-09-02. Verified via
-- pg_proc.proconfig that all 4 functions carry search_path="public,
-- pg_temp" post-apply. Kept here as the reproducible record of what ran,
-- and to apply the same fix to any environment this hasn't reached yet.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public, pg_temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public, pg_temp'
AS $function$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable — UPDATE and DELETE are permanently disabled';
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_all_materialized_views()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public, pg_temp'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_platform_revenue_monthly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_growth_weekly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_property_demand_by_city;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_landlord_finance_monthly;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_kpis()
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public, pg_temp'
AS $function$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'totalUsers',          (SELECT COUNT(*) FROM users WHERE role != 'ADMIN'),
    'totalProperties',     (SELECT COUNT(*) FROM properties WHERE status != 'DRAFT'),
    'platformRevenueRwf',  (SELECT COALESCE(SUM(amount_rwf), 0) FROM payments WHERE status = 'COMPLETED'),
    'pendingKYC',          (SELECT COUNT(*) FROM users WHERE kyc_status = 'PENDING'),
    'pendingApplications', (SELECT COUNT(*) FROM applications WHERE status = 'PENDING'),
    'failedPayments',      (SELECT COUNT(*) FROM payments
                            WHERE status = 'FAILED'
                              AND created_at > NOW() - INTERVAL '24 hours')
  ) INTO result;
  RETURN result;
END;
$function$;
