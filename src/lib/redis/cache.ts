import { redis } from './client';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/constants';

export async function getCache<T>(key: string): Promise<T | null> {
  return redis.get<T>(key);
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await redis.set(key, value, { ex: ttlSeconds });
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  let cursor = 0;
  do {
    const result = await redis.scan(cursor, { match: pattern, count: 100 });
    cursor = result[0] as unknown as number;
    const keys = result[1] as string[];
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== 0);
}

export { CACHE_KEYS, CACHE_TTL };