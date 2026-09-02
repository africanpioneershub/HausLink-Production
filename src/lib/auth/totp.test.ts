import { describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { generateAdminTotpSecret, buildOtpAuthUri, verifyAdminOtp } from './totp';

describe('totp', () => {
  it('generates a usable base32 secret', () => {
    const secret = generateAdminTotpSecret();
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it('builds an otpauth:// URI naming HausLink Admin and the account email', () => {
    const uri = buildOtpAuthUri('JBSWY3DPEHPK3PXP', 'admin@hauslink.com');
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('HausLink%20Admin');
    expect(uri).toContain('admin%40hauslink.com');
  });

  it('accepts a code generated from the same secret', () => {
    const secret = generateAdminTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyAdminOtp(code, secret)).toBe(true);
  });

  it('rejects a code generated from a different admin\'s secret -- the exact vulnerability this fix closes', () => {
    // Previously every admin verified against ONE shared secret, so any
    // admin's code worked for any admin's challenge. Two distinct,
    // independently-generated secrets must not accept each other's codes.
    const secretA = generateAdminTotpSecret();
    const secretB = generateAdminTotpSecret();
    const codeForA = authenticator.generate(secretA);

    expect(verifyAdminOtp(codeForA, secretB)).toBe(false);
  });

  it('rejects an empty or garbage code', () => {
    const secret = generateAdminTotpSecret();
    expect(verifyAdminOtp('', secret)).toBe(false);
    expect(verifyAdminOtp('000000', secret)).toBe(false);
  });

  it('rejects any code when the secret is empty', () => {
    expect(verifyAdminOtp('123456', '')).toBe(false);
  });
});
