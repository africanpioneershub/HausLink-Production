const BASE = 'https://www.hauselink.com';

(async () => {
  console.log('=== DIMENSION 1 — FUNCTIONALITY ===\n');

  const endpoints = [
    // Public — expect 200
    ['GET', '/api/public/stats',                                null, 200],
    ['GET', '/api/public/properties',                           null, 200],
    ['GET', '/api/public/properties?search=kiyovu',             null, 200],
    ['GET', '/api/public/properties?type=APARTMENT',            null, 200],
    ['GET', '/api/public/properties?district=Gasabo',           null, 200],
    ['GET', '/api/public/properties?minPrice=100000',           null, 200],
    ['GET', '/api/public/properties?maxPrice=5000000',          null, 200],
    ['GET', '/api/public/properties?beds=2',                    null, 200],
    ['GET', '/api/public/properties?featured=true',             null, 200],
    // Protected — expect 401 without auth
    ['GET', '/api/admin/users',                                 null, 401],
    ['GET', '/api/admin/payments',                              null, 401],
    ['GET', '/api/admin/dashboard/kpis',                        null, 401],
    ['GET', '/api/admin/kyc',                                   null, 401],
    ['GET', '/api/tenant/applications',                         null, 401],
    ['GET', '/api/tenant/saved',                                null, 401],
    ['GET', '/api/landlord/properties',                         null, 401],
    ['GET', '/api/landlord/maintenance',                        null, 401],
    ['GET', '/api/user/profile',                                null, 401],
    // Validation — expect 400 on bad input
    ['POST', '/api/auth/register',                              {}, 400],
    ['POST', '/api/contact',                                    {}, 400],
  ];

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const [method, path, body, expectedStatus] of endpoints) {
    try {
      const res = await fetch(BASE + path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      const ok = res.status === expectedStatus;
      const label = `${method} ${path}`;
      if (ok) {
        console.log(`✅ ${label} → ${res.status}`);
        passed++;
      } else {
        console.log(`❌ ${label} → ${res.status} (expected ${expectedStatus})`);
        failed++;
        failures.push({ label, got: res.status, expected: expectedStatus });
      }
    } catch (e) {
      console.log(`❌ ${method} ${path} → ERROR: ${e.message}`);
      failed++;
      failures.push({ label: `${method} ${path}`, got: 'ERROR', expected: expectedStatus });
    }
  }

  // Verify stats payload shape
  console.log('\n--- Stats payload ---');
  const statsRes = await fetch(`${BASE}/api/public/stats`);
  const statsJson = await statsRes.json();
  const statsData = statsJson.data ?? statsJson;
  for (const [key, val] of Object.entries(statsData)) {
    console.log(`  ${key}: ${val}`);
  }

  // Verify properties payload shape
  console.log('\n--- Properties payload (first item) ---');
  const propsRes = await fetch(`${BASE}/api/public/properties`);
  const propsJson = await propsRes.json();
  const propsData = propsJson.data ?? propsJson;
  const props = Array.isArray(propsData) ? propsData : propsData.data;
  if (props && props.length > 0) {
    const p = props[0];
    console.log(`  id: ${p.id}`);
    console.log(`  title: ${p.title}`);
    console.log(`  status: ${p.status}`);
    console.log(`  rent_rwf: ${p.rent_rwf}`);
    console.log(`  images count: ${p.images?.length ?? 0}`);
    console.log(`  views: ${p.view_count ?? p.views ?? 'n/a'}`);
    // Save first property ID for speed tests
    require('fs').writeFileSync(require('path').join(__dirname, '..', 'tmp-prop-id.txt'), p.id);
  } else {
    console.log('  No properties returned');
  }

  console.log(`\nFunctionality: ${passed}/${passed + failed} passed${failed > 0 ? `, ${failed} FAILED` : ''}`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ${f.label}: got ${f.got}, expected ${f.expected}`));
  }
})();
