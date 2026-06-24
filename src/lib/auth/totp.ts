import { authenticator } from 'otplib';

export function isAdminOtpConfigured(): boolean {
  const secret = process.env.ADMIN_OTP_SECRET;
  return !!secret && secret.length >= 16;
}

export function verifyAdminOtp(code: string): boolean {
  const secret = process.env.ADMIN_OTP_SECRET;
  if (!secret || secret.length < 16) {
    // Fail closed: an unconfigured secret must never authenticate.
    return false;
  }
  try {
    return authenticator.check(code, secret);
  } catch {
    return false;
  }
}
