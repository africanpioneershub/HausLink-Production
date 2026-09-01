import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { AuthError } from '@supabase/supabase-js';

export { isAuthRetryableFetchError };

/**
 * Extracts a fully diagnosable, JSON-safe snapshot of a Supabase auth error
 * (or any thrown value) for logging. An Error instance passed as a
 * console.error argument can render as `{}` once it passes through a
 * JSON-based log pipeline -- Error's own properties (message, stack) are
 * non-enumerable by default -- so this pulls every field that actually
 * carries signal out into plain enumerable properties.
 *
 * Note: AuthRetryableFetchError has no `.cause` -- its `.message` is
 * whatever string auth-js constructed it with, which can itself be the
 * literal text "{}" when GoTrue's upstream response body was empty or
 * unparseable. That is not this function failing to extract something;
 * it is auth-js's own diagnostic ceiling for that error class. Capturing
 * `.cause` here is still worthwhile defensively, since a native `fetch`
 * TypeError (network/DNS/TLS failure) does carry one, and a future
 * supabase-js version -- or a different error entirely -- may propagate it.
 */
export function serializeAuthError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const authError = error as Partial<AuthError>;
    return {
      name: error.name,
      message: error.message,
      status: authError.status,
      code: authError.code,
      cause: (error as { cause?: unknown }).cause,
      stack: error.stack,
    };
  }
  return { value: error };
}

const DEFAULT_RETRIES = 2;
const BASE_DELAY_MS = 200;

/**
 * Retries a Supabase auth call that returns `{ data, error }` when `error`
 * is an AuthRetryableFetchError -- the class Supabase's own client uses
 * specifically to mean "the network request itself failed" (as opposed to
 * a normal 4xx/5xx API response), which by definition can be transient
 * (serverless cold-start jitter, a momentary GoTrue hiccup). Supabase's
 * client already retries this internally for token refresh
 * (GoTrueClient#_refreshAccessToken) but not for one-off calls like
 * signUp() or resend() -- this fills that gap for those call sites.
 *
 * Short exponential backoff, bounded attempts: stays well under a Vercel
 * function's timeout even in the worst case.
 */
export async function withAuthRetry<T extends { error: unknown }>(
  fn: () => Promise<T>,
  { retries = DEFAULT_RETRIES, baseDelayMs = BASE_DELAY_MS }: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let result: T;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)));
    }
    result = await fn();
    if (!isAuthRetryableFetchError(result.error)) {
      return result;
    }
  }
  return result!;
}
