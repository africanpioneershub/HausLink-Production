import { describe, expect, it } from 'vitest';
import { getClientIp } from './admin-guard';

function makeRequest(headers: Record<string, string>) {
  return new Request('http://localhost/api/admin/test', { headers });
}

describe('getClientIp', () => {
  it('prefers x-real-ip when present -- Vercel sets this itself, not client-settable', () => {
    const request = makeRequest({
      'x-real-ip': '203.0.113.9',
      'x-forwarded-for': '198.51.100.1, 203.0.113.9',
    });

    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('falls back to the LAST x-forwarded-for entry, not the first -- the exact spoofing vector this closes', () => {
    // A client can set their own X-Forwarded-For header; Vercel's edge
    // appends the real client IP rather than replacing it, so the
    // client-controlled value ends up first and the trustworthy one last.
    // The old code read index [0] -- the attacker-controlled end.
    const request = makeRequest({
      'x-forwarded-for': '1.2.3.4, 203.0.113.9',
    });

    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('handles a single-value x-forwarded-for with no chain', () => {
    const request = makeRequest({ 'x-forwarded-for': '203.0.113.9' });
    expect(getClientIp(request)).toBe('203.0.113.9');
  });

  it('returns an empty string when neither header is present', () => {
    const request = makeRequest({});
    expect(getClientIp(request)).toBe('');
  });
});
