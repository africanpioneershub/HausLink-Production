const ALLOWLIST_RAW = process.env.ADMIN_IP_ALLOWLIST ?? '';

const ADMIN_IP_ALLOWLIST: string[] = ALLOWLIST_RAW
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

export function isAdminIpAllowed(ip: string): boolean {
  if (ADMIN_IP_ALLOWLIST.length === 0) return true;
  return ADMIN_IP_ALLOWLIST.includes(ip);
}
