import { Redis } from '@upstash/redis';
import '@/lib/env-check';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    throw new Error(
      '[Redis] FATAL: UPSTASH_REDIS_REST_URL is not set. ' +
        'Rate limiting, caching, and 2FA sessions require Redis. ' +
        'Set this in Vercel environment variables.'
    );
  }
  if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error(
      '[Redis] FATAL: UPSTASH_REDIS_REST_TOKEN is not set. ' +
        'Set this in Vercel environment variables.'
    );
  }
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});