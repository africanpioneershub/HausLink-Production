const BASE = 'https://www.hauselink.com';
const fs = require('fs');

async function measure(url, reps = 3) {
  const times = [];
  for (let i = 0; i < reps; i++) {
    const t = Date.now();
    try { await fetch(url, { redirect: 'follow' }); } catch {}
    times.push(Date.now() - t);
  }
  return {
    avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    min: Math.min(...times),
    max: Math.max(...times),
    times,
  };
}

(async () => {
  console.log('=== DIMENSION 2 — SPEED ===\n');

  // Try to read a real property ID saved by functionality script
  // Use known property ID from functionality check
  let propId = 'cmqv272rs000bqo6o41th2nfj';
  try { propId = fs.readFileSync(require('path').join(__dirname, '..', 'tmp-prop-id.txt'), 'utf-8').trim(); } catch {}

  const endpoints = [
    ['Homepage',                  `${BASE}/`],
    ['Properties page',           `${BASE}/properties`],
    ['Property detail',           `${BASE}/properties/${propId}`],
    ['Stats API',                 `${BASE}/api/public/stats`],
    ['Properties API',            `${BASE}/api/public/properties`],
    ['Props API w/ search',       `${BASE}/api/public/properties?search=kiyovu`],
    ['Props API w/ filter',       `${BASE}/api/public/properties?type=APARTMENT`],
  ];

  const results = [];

  console.log(`${'Endpoint'.padEnd(32)} ${'avg'.padStart(7)} ${'min'.padStart(7)} ${'max'.padStart(7)}  status`);
  console.log('─'.repeat(68));

  for (const [name, url] of endpoints) {
    const m = await measure(url);
    const icon = m.avg < 500 ? '🟢' : m.avg < 1500 ? '🟡' : '🔴';
    console.log(
      `${icon} ${name.padEnd(30)} ${String(m.avg + 'ms').padStart(7)} ${String(m.min + 'ms').padStart(7)} ${String(m.max + 'ms').padStart(7)}`
    );
    results.push({ name, ...m });
  }

  // Cache test — call properties twice, check second is faster
  console.log('\n--- Cache Speedup Test ---');
  const cold1 = await measure(`${BASE}/api/public/properties`, 1);
  const warm1 = await measure(`${BASE}/api/public/properties`, 1);
  const speedup = cold1.avg > 0 ? (cold1.avg / warm1.avg).toFixed(1) : 1;
  console.log(`  Call 1 (cold/warm): ${cold1.avg}ms`);
  console.log(`  Call 2 (warm):      ${warm1.avg}ms`);
  console.log(`  Speedup: ${speedup}x ${cold1.avg > warm1.avg ? '✅ cache hit' : '⚠️ similar times (already warm)'}`);

  const cold2 = await measure(`${BASE}/api/public/stats`, 1);
  const warm2 = await measure(`${BASE}/api/public/stats`, 1);
  const statsSpeedup = cold2.avg > 0 ? (cold2.avg / warm2.avg).toFixed(1) : 1;
  console.log(`\n  Stats call 1: ${cold2.avg}ms`);
  console.log(`  Stats call 2: ${warm2.avg}ms`);
  console.log(`  Speedup: ${statsSpeedup}x ${cold2.avg > warm2.avg ? '✅' : '⚠️ already warm'}`);

  const slowest = results.sort((a, b) => b.avg - a.avg)[0];
  console.log(`\nSlowest endpoint: ${slowest.name} @ ${slowest.avg}ms avg`);
  console.log('\nLegend: 🟢 <500ms  🟡 500-1500ms  🔴 >1500ms');
})();
