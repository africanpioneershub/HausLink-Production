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
