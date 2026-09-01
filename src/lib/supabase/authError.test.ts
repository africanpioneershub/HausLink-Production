import { describe, expect, it, vi } from 'vitest';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { serializeAuthError, withAuthRetry } from './authError';

describe('serializeAuthError', () => {
  it('extracts name, message, status, and code instead of collapsing to {}', () => {
    // Reproduces the exact error class and shape seen in production logs:
    // AuthRetryableFetchError whose own .message is the literal string "{}"
    // (auth-js's own diagnostic ceiling when GoTrue's response body is
    // empty/unparseable) -- serializeAuthError must still surface every
    // real field around it, not hide the fact that message itself is "{}".
    const error = new AuthRetryableFetchError('{}', 500);

    const serialized = serializeAuthError(error);

    expect(serialized.name).toBe('AuthRetryableFetchError');
    expect(serialized.message).toBe('{}');
    expect(serialized.status).toBe(500);
    expect(serialized.stack).toEqual(expect.stringContaining('AuthRetryableFetchError'));
    // Proves this is a real object with real fields, not the {} the
    // original bug report was about -- JSON.stringify must not collapse it.
    expect(Object.keys(JSON.parse(JSON.stringify(serialized))).length).toBeGreaterThan(1);
  });

  it('captures .cause when a native fetch-style error carries one', () => {
    const cause = new Error('ECONNREFUSED');
    const error = new Error('fetch failed', { cause });

    const serialized = serializeAuthError(error);

    expect(serialized.cause).toBe(cause);
  });

  it('captures status and code from a real AuthApiError', () => {
    const error = new AuthApiError('User already registered', 422, 'user_already_exists');

    const serialized = serializeAuthError(error);

    expect(serialized.status).toBe(422);
    expect(serialized.code).toBe('user_already_exists');
    expect(serialized.message).toBe('User already registered');
  });

  it('handles a non-Error thrown value without crashing', () => {
    expect(serializeAuthError('a string was thrown')).toEqual({ value: 'a string was thrown' });
    expect(serializeAuthError(null)).toEqual({ value: null });
  });
});

describe('withAuthRetry', () => {
  it('returns immediately when there is no error', async () => {
    const fn = vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null });

    const result = await withAuthRetry(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
  });

  it('does not retry a non-retryable auth error (e.g. duplicate signup)', async () => {
    const nonRetryable = new AuthApiError('User already registered', 422, 'user_already_exists');
    const fn = vi.fn().mockResolvedValue({ data: { user: null }, error: nonRetryable });

    const result = await withAuthRetry(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.error).toBe(nonRetryable);
  });

  it('retries on AuthRetryableFetchError and succeeds once the transient failure clears', async () => {
    const transient = new AuthRetryableFetchError('{}', 500);
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: transient })
      .mockResolvedValueOnce({ data: { user: { id: '1' } }, error: null });

    const result = await withAuthRetry(fn, { baseDelayMs: 1 });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.error).toBeNull();
  });

  it('gives up after the retry budget and returns the last retryable error', async () => {
    const transient = new AuthRetryableFetchError('{}', 500);
    const fn = vi.fn().mockResolvedValue({ data: null, error: transient });

    const result = await withAuthRetry(fn, { retries: 2, baseDelayMs: 1 });

    // 1 initial attempt + 2 retries = 3 total calls, then gives up.
    expect(fn).toHaveBeenCalledTimes(3);
    expect(result.error).toBe(transient);
  });
});
