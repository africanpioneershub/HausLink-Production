import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'crypto';

describe('totpSecret', () => {
  beforeEach(() => {
    vi.stubEnv('TOTP_ENCRYPTION_KEY', randomBytes(32).toString('base64'));
    vi.resetModules();
  });

  it('round-trips a secret through encrypt then decrypt', async () => {
    const { encryptTotpSecret, decryptTotpSecret } = await import('./totpSecret');
    const plain = 'JBSWY3DPEHPK3PXP';

    const encrypted = encryptTotpSecret(plain);
    expect(encrypted).not.toContain(plain);
    expect(decryptTotpSecret(encrypted)).toBe(plain);
  });

  it('produces a different ciphertext each time (random IV) even for the same input', async () => {
    const { encryptTotpSecret } = await import('./totpSecret');
    const a = encryptTotpSecret('same-secret');
    const b = encryptTotpSecret('same-secret');
    expect(a).not.toBe(b);
  });

  it('throws when TOTP_ENCRYPTION_KEY is not set', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const { encryptTotpSecret } = await import('./totpSecret');
    expect(() => encryptTotpSecret('secret')).toThrow(/TOTP_ENCRYPTION_KEY/);
  });

  it('throws when TOTP_ENCRYPTION_KEY does not decode to 32 bytes', async () => {
    vi.stubEnv('TOTP_ENCRYPTION_KEY', Buffer.from('too-short').toString('base64'));
    vi.resetModules();
    const { encryptTotpSecret } = await import('./totpSecret');
    expect(() => encryptTotpSecret('secret')).toThrow(/32 bytes/);
  });

  it('rejects a tampered ciphertext -- the GCM auth tag catches modification', async () => {
    const { encryptTotpSecret, decryptTotpSecret } = await import('./totpSecret');
    const encrypted = encryptTotpSecret('a-real-secret');
    const [iv, tag, data] = encrypted.split(':');
    const tamperedData = Buffer.from(data, 'base64');
    tamperedData[0] ^= 0xff; // flip a bit
    const tampered = [iv, tag, tamperedData.toString('base64')].join(':');

    expect(() => decryptTotpSecret(tampered)).toThrow();
  });
});
