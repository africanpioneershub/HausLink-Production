import { authenticator } from 'otplib';

export function generateAdminTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpAuthUri(secret: string, accountEmail: string): string {
  return authenticator.keyuri(accountEmail, 'HausLink Admin', secret);
}

// secret is the admin's own decrypted TOTP secret (see totpSecret.ts) --
// there is no longer a single shared secret every admin verifies against.
export function verifyAdminOtp(code: string, secret: string): boolean {
  if (!secret) return false;
  try {
    return authenticator.check(code, secret);
  } catch {
    return false;
  }
}
