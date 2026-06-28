// Clear all property list cache keys from Upstash Redis
(async () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
    process.exit(1);
  }

  // KEYS command to find all public:properties:* cache entries
  const keysRes = await fetch(`${url}/keys/public:properties:*`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const keysJson = await keysRes.json();
  const keys = keysJson.result ?? [];

  if (keys.length === 0) {
    console.log('No cached property keys found (cache already empty or expired)');
    return;
  }

  let cleared = 0;
  for (const key of keys) {
    const res = await fetch(`${url}/del/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.result > 0) {
      console.log(`Deleted: ${key}`);
      cleared++;
    }
  }

  console.log(`\nCleared ${cleared} cache key(s)`);
})();
