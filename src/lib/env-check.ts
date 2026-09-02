const REQUIRED_RUNTIME_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'CSRF_SECRET',
  'CRON_SECRET',
  'TOTP_ENCRYPTION_KEY',
  'RESEND_API_KEY',
  'REDIS_URL',
] as const;

if (process.env.NODE_ENV === 'production') {
  const missing = REQUIRED_RUNTIME_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // REDIS_URL silently falling back to a default previously caused a
    // two-month-long production outage (ECONNREFUSED 127.0.0.1:6379) --
    // see docs/INCIDENT_LOG.md. Call it out explicitly so the next person
    // doesn't confuse it with UPSTASH_REDIS_REST_URL above.
    const redisNote = missing.includes('REDIS_URL')
      ? ' REDIS_URL is a real TCP Redis connection string (redis:// or ' +
        'rediss://) required by BullMQ, the job queue -- it is distinct ' +
        'from UPSTASH_REDIS_REST_URL above, which is a separate REST-based ' +
        'client used for rate limiting and is not BullMQ-compatible.'
      : '';
    throw new Error(
      `[ENV] FATAL: Missing required environment variables: ${missing.join(', ')}. ` +
        'Set these in Vercel environment variables and redeploy.' +
        redisNote
    );
  }
}

export const ENV_VALIDATED = true;
