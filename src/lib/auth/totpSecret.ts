import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// AES-256-GCM at-rest encryption for per-admin TOTP secrets stored in
// User.totp_secret_encrypted. TOTP_ENCRYPTION_KEY must be a 32-byte key,
// base64-encoded (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))").
// Distinct from CSRF_SECRET/ADMIN_OTP_SECRET -- this key's only job is
// encrypting/decrypting these secrets, so it can be rotated independently.
function getEncryptionKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      '[totpSecret] TOTP_ENCRYPTION_KEY is not set -- required to store or read admin TOTP secrets.'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('[totpSecret] TOTP_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).');
  }
  return key;
}

// Stored format: base64(iv) : base64(authTag) : base64(ciphertext)
export function encryptTotpSecret(plainSecret: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV, standard for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptTotpSecret(stored: string): string {
  const key = getEncryptionKey();
  const parts = stored.split(':');
  if (parts.length !== 3) {
    throw new Error('[totpSecret] Malformed encrypted secret (expected iv:authTag:ciphertext)');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
