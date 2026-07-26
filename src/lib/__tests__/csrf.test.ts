import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createHmac } from 'crypto';
import { SECURITY } from '../constants';

// Save original env variables to avoid polluting other modules
const originalEnv = { ...process.env };

describe('CSRF Module Tests', () => {
  beforeEach(() => {
    // Restore original env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env after each test
    process.env = { ...originalEnv };
    // Clear the require cache of the csrf module to make sure next test starts fresh
    try {
      const resolvedPath = require.resolve('../csrf');
      delete require.cache[resolvedPath];
    } catch (e) {
      // Ignore if not loaded
    }
    try {
      const envCheckPath = require.resolve('../env-check');
      delete require.cache[envCheckPath];
    } catch (e) {
      // Ignore if not loaded
    }
  });

  test('generateCsrfToken should create a valid token structure', () => {
    process.env.CSRF_SECRET = 'my-super-secret-key-12345';
    // Import the csrf module dynamically so it picks up the CSRF_SECRET
    const { generateCsrfToken } = require('../csrf');

    const token = generateCsrfToken();
    assert.strictEqual(typeof token, 'string');

    const parts = token.split(':');
    assert.strictEqual(parts.length, 3);

    const [nonce, ts, sig] = parts;
    assert.ok(nonce.length > 0, 'nonce should not be empty');
    assert.ok(ts.length > 0, 'timestamp should not be empty');
    assert.ok(sig.length > 0, 'signature should not be empty');
  });

  test('validateCsrfToken should return true for a valid generated token', () => {
    process.env.CSRF_SECRET = 'my-super-secret-key-12345';
    const { generateCsrfToken, validateCsrfToken } = require('../csrf');

    const token = generateCsrfToken();
    const isValid = validateCsrfToken(token);
    assert.strictEqual(isValid, true);
  });

  test('validateCsrfToken should return false if the token payload has a tampered nonce', () => {
    process.env.CSRF_SECRET = 'my-super-secret-key-12345';
    const { generateCsrfToken, validateCsrfToken } = require('../csrf');

    const token = generateCsrfToken();
    const parts = token.split(':');
    // Tamper with the nonce
    parts[0] = parts[0] + 'tampered';
    const tamperedToken = parts.join(':');

    const isValid = validateCsrfToken(tamperedToken);
    assert.strictEqual(isValid, false);
  });

  test('validateCsrfToken should return false if the token payload has a tampered timestamp', () => {
    process.env.CSRF_SECRET = 'my-super-secret-key-12345';
    const { generateCsrfToken, validateCsrfToken } = require('../csrf');

    const token = generateCsrfToken();
    const parts = token.split(':');
    // Tamper with the timestamp
    parts[1] = parts[1] + '1';
    const tamperedToken = parts.join(':');

    const isValid = validateCsrfToken(tamperedToken);
    assert.strictEqual(isValid, false);
  });

  test('validateCsrfToken should return false if the token has a tampered signature', () => {
    process.env.CSRF_SECRET = 'my-super-secret-key-12345';
    const { generateCsrfToken, validateCsrfToken } = require('../csrf');

    const token = generateCsrfToken();
    const parts = token.split(':');
    // Tamper with the signature
    parts[2] = parts[2].substring(0, parts[2].length - 1) + (parts[2].endsWith('0') ? '1' : '0');
    const tamperedToken = parts.join(':');

    const isValid = validateCsrfToken(tamperedToken);
    assert.strictEqual(isValid, false);
  });

  test('validateCsrfToken should return false for invalid token formats', () => {
    process.env.CSRF_SECRET = 'my-super-secret-key-12345';
    const { validateCsrfToken } = require('../csrf');

    assert.strictEqual(validateCsrfToken(''), false);
    assert.strictEqual(validateCsrfToken(null as any), false);
    assert.strictEqual(validateCsrfToken(undefined as any), false);
    assert.strictEqual(validateCsrfToken(12345 as any), false);
    assert.strictEqual(validateCsrfToken('part1:part2'), false);
    assert.strictEqual(validateCsrfToken('part1:part2:part3:part4'), false);
  });

  test('validateCsrfToken should return false if the token has expired', () => {
    const secret = 'my-super-secret-key-12345';
    process.env.CSRF_SECRET = secret;
    const { validateCsrfToken } = require('../csrf');

    // Create an expired timestamp (e.g. 2 hours ago, whereas TTL is typically 1 hour)
    const expiredAgeMs = (SECURITY.CSRF_TOKEN_TTL_SECONDS + 100) * 1000;
    const expiredTs = (Date.now() - expiredAgeMs).toString(36);
    const nonce = 'testnonce';
    const payload = `${nonce}:${expiredTs}`;
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    const expiredToken = `${payload}:${sig}`;

    const isValid = validateCsrfToken(expiredToken);
    assert.strictEqual(isValid, false);
  });

  test('validateCsrfToken should return false if the timestamp is malformed/not parseable', () => {
    const secret = 'my-super-secret-key-12345';
    process.env.CSRF_SECRET = secret;
    const { validateCsrfToken } = require('../csrf');

    // Create a payload with a non-base36 timestamp, e.g., containing characters like '-'
    const nonce = 'testnonce';
    const malformedTs = 'not-a-number';
    const payload = `${nonce}:${malformedTs}`;
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    const malformedToken = `${payload}:${sig}`;

    const isValid = validateCsrfToken(malformedToken);
    assert.strictEqual(isValid, false);
  });

  test('validateCsrfToken should return false if the secret is empty or missing', () => {
    process.env.CSRF_SECRET = '';
    const { validateCsrfToken } = require('../csrf');

    // Even if we have a seemingly valid format, validateCsrfToken should return false
    // because !SECRET checks will fail.
    const isValid = validateCsrfToken('nonce:timestamp:signature');
    assert.strictEqual(isValid, false);
  });

  test('validateCsrfToken should return false if signature length is different from expected length', () => {
    process.env.CSRF_SECRET = 'my-super-secret-key-12345';
    const { validateCsrfToken } = require('../csrf');

    // Signature hex for sha256 should be 64 characters long. Let's pass a shorter signature.
    const token = `nonce:timestamp:shortsig`;
    const isValid = validateCsrfToken(token);
    assert.strictEqual(isValid, false);
  });

  test('validateCsrfToken should return false if signature is non-hex', () => {
    process.env.CSRF_SECRET = 'my-super-secret-key-12345';
    const { validateCsrfToken } = require('../csrf');

    // Passing a signature with non-hex characters (e.g., 'g') that is the right length
    const invalidHexSig = 'g'.repeat(64);
    const token = `nonce:timestamp:${invalidHexSig}`;
    const isValid = validateCsrfToken(token);
    assert.strictEqual(isValid, false);
  });

  test('Should throw an error in production environment when CSRF_SECRET is not set', () => {
    process.env.NODE_ENV = 'production';
    process.env.CSRF_SECRET = '';

    // Importing the module in production with no CSRF_SECRET should throw an error.
    // We expect it to throw either from env-check or from csrf.ts itself.
    assert.throws(() => {
      require('../csrf');
    }, (err: any) => {
      return err instanceof Error && err.message.includes('FATAL');
    });
  });
});
