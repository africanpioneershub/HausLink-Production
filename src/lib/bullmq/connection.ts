import type { ConnectionOptions } from 'bullmq';

function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
}

// No localhost fallback: a missing REDIS_URL must fail loudly and
// immediately, not silently attempt 127.0.0.1:6379 and hang until the
// caller's timeout (30s in a Vercel function). Callers must invoke this
// lazily (at request/job time, not at module import time) so it never runs
// during Next.js's build-time page-data collection.
export function getBullmqConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      '[bullmq] REDIS_URL is not set. BullMQ needs a real TCP Redis ' +
        'connection string (redis:// or rediss://) -- UPSTASH_REDIS_REST_URL ' +
        'is a different, REST-based client used elsewhere for rate limiting ' +
        'and is not compatible with BullMQ. Set REDIS_URL in the environment.'
    );
  }
  return parseRedisUrl(url);
}
