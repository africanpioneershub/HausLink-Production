const REQUIRED_RUNTIME_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'CSRF_SECRET',
  'CRON_SECRET',
  'ADMIN_OTP_SECRET',
  'RESEND_API_KEY',
] as const;

if (process.env.NODE_ENV === 'production') {
  const missing = REQUIRED_RUNTIME_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[ENV] FATAL: Missing required environment variables: ${missing.join(', ')}. ` +
        'Set these in Vercel environment variables and redeploy.'
    );
  }
}

export const ENV_VALIDATED = true;
