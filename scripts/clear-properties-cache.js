// Clears all public:properties:* keys from Upstash Redis via REST API.
// Run after fixing the images array format so stale string-format entries are evicted.

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

async function redisGet(path) {
  const res = await fetch(`${REDIS_URL}${path}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  return res.json();
}

async function redisDel(keys) {
  const res = await fetch(`${REDIS_URL}/del/${keys.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  return res.json();
}

(async () => {
  console.log('Scanning for public:properties:* keys...\n');

  const allKeys = [];
  let cursor = 0;

  do {
    const result = await redisGet(`/scan/${cursor}?match=public%3Aproperties%3A*&count=100`);
    if (!result.result) {
      console.error('Scan failed:', JSON.stringify(result));
      process.exit(1);
    }
    const [nextCursor, keys] = result.result;
    cursor = Number(nextCursor);
    allKeys.push(...keys);
  } while (cursor !== 0);

  console.log(`Found ${allKeys.length} key(s):`);
  allKeys.forEach((k) => console.log(`  ${k}`));

  if (allKeys.length === 0) {
    console.log('\nNothing to delete.');
    process.exit(0);
  }

  // Delete in batches of 10 (Upstash DEL accepts multiple keys in the URL path)
  let deleted = 0;
  for (let i = 0; i < allKeys.length; i += 10) {
    const batch = allKeys.slice(i, i + 10);
    const result = await redisDel(batch);
    deleted += result.result ?? 0;
  }

  console.log(`\nDeleted ${deleted} key(s). ✅`);
  console.log('Next request to /api/public/properties will rebuild the cache with the correct array format.');
})();
