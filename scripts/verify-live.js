// Benchmark the property detail page on the live site.
// Measures cold (first hit, cache miss) and warm (subsequent, cache hit) latency.

const PROP_ID = 'cmqv272rs000bqo6o41th2nfj';
const BASE = 'https://hauselink.com';
const DETAIL_URL = `${BASE}/properties/${PROP_ID}`;
const LIST_URL   = `${BASE}/api/public/properties?page=1&pageSize=6`;

async function measure(url, label) {
  const t0 = Date.now();
  const res = await fetch(url, { redirect: 'follow' });
  const ms = Date.now() - t0;
  const ok = res.status < 400;
  console.log(`  ${ok ? '✅' : '❌'} [${res.status}] ${label.padEnd(40)} ${ms}ms`);
  return ms;
}

(async () => {
  console.log('=== Property Detail Page Speed Verification ===\n');
  console.log(`Target: ${DETAIL_URL}\n`);

  // Round 1 — cold (likely cache miss if deploy just happened)
  console.log('--- Round 1: Cold hit (cache miss expected) ---');
  const cold1 = await measure(DETAIL_URL, 'Property detail (cold)');

  // Give the cache 200ms to write async
  await new Promise(r => setTimeout(r, 200));

  // Round 2 — warm (cache hit)
  console.log('\n--- Round 2: Warm hit (cache hit expected) ---');
  const warm1 = await measure(DETAIL_URL, 'Property detail (warm 1)');
  const warm2 = await measure(DETAIL_URL, 'Property detail (warm 2)');
  const warm3 = await measure(DETAIL_URL, 'Property detail (warm 3)');

  const avgWarm = Math.round((warm1 + warm2 + warm3) / 3);
  const improvement = cold1 > 0 ? Math.round(((cold1 - avgWarm) / cold1) * 100) : 0;

  console.log('\n--- Also check list page (should be unaffected) ---');
  await measure(LIST_URL, 'Property list API');

  console.log('\n=== Summary ===');
  console.log(`  Cold (first hit):  ${cold1}ms`);
  console.log(`  Warm avg (3 hits): ${avgWarm}ms`);
  console.log(`  Improvement:       ${improvement}%`);

  if (avgWarm < 500) {
    console.log('\n✅ PASS — warm responses are sub-500ms (cache working)');
  } else if (avgWarm < cold1 * 0.5) {
    console.log('\n✅ PASS — warm responses >50% faster than cold');
  } else {
    console.log('\n⚠️  Cache may not be working — warm not significantly faster than cold');
  }
})();
