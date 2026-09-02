// x-forwarded-for can be client-supplied: Vercel's edge appends the real
// client IP rather than replacing whatever the client sent, so index [0]
// is the client-controlled end of that header, not the trustworthy one.
// x-real-ip is Vercel's own single-value header, set by their edge and not
// client-settable, so it's the reliable one to use for anything
// security-relevant (the admin IP allowlist, admin audit-log entries).
// Falls back to the LAST x-forwarded-for entry (Vercel's own append,
// furthest from the client) for non-Vercel environments where x-real-ip
// might be absent, rather than the first.
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const parts = forwardedFor.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return '';
}

const ALLOWLIST_RAW = process.env.ADMIN_IP_ALLOWLIST ?? '';

const ADMIN_IP_ALLOWLIST: string[] = ALLOWLIST_RAW
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

export function isAdminIpAllowed(ip: string): boolean {
  if (ADMIN_IP_ALLOWLIST.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    console.error(
      '[admin-guard] ADMIN_IP_ALLOWLIST not set in production - blocking all admin access'
    );
    return false;
  }
  return ADMIN_IP_ALLOWLIST.includes(ip);
}
