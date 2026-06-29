const HTML_TAG_RE = /<[^>]*>/g;
const DANGEROUS_PROTO_RE = /^(javascript|data|vbscript):/i;

export function sanitizeString(input: string): string {
  return input.replace(HTML_TAG_RE, '').trim();
}

export function sanitizeUrl(input: string): string | null {
  if (DANGEROUS_PROTO_RE.test(input.trim())) return null;
  return input.trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeString(val);
    }
  }
  return result;
}
