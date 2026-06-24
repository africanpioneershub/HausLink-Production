import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './client';

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '60 s'),
  analytics: true,
  prefix: 'rl:api',
});

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, '60 s'),
  analytics: true,
  prefix: 'rl:auth',
});

export const paymentRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, '60 s'),
  analytics: true,
  prefix: 'rl:payment',
});

export async function applyRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; reset: number }> {
  const { success, reset } = await limiter.limit(identifier);
  return { success, reset };
}