function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
}

export const bullmqConnection = parseRedisUrl(process.env.REDIS_URL ?? 'redis://localhost:6379');
