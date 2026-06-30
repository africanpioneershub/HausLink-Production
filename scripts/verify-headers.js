process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE = 'https://hauselink.com';

const ROUTES = [
  '/',
  '/properties',
  '/properties/cmqv272rs000bqo6o41th2nfj',
  '/login',
  '/register',
  '/pricing',
  '/about',
  '/contact',
  '/api/public/properties?page=1&pageSize=1',
  '/api/admin/dashboard/kpis',
  '/api/health',
];

const REQUIRED = {
  'permissions-policy':       'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'x-frame-options':          'DENY',
  'x-content-type-options':   'nosniff',
  'referrer-policy':          'strict-origin-when-cross-origin',
};

const PRESENT = [
  'content-security-policy',
];

(async () => {
  console.log('=== Security Headers Check ===\n');
  console.log(`${'Route'.padEnd(52)} PP  XFO XCTO RP  CSP`);
  console.log('─'.repeat(80));

  let totalPass = 0, totalFail = 0;
  const failures = [];

  for (const route of ROUTES) {
    const url = BASE + route;
    let headers;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      headers = res.headers;
    } catch (e) {
      console.log(`  ❌ ${route} — fetch error: ${e.message}`);
      totalFail++;
      continue;
    }

    const checks = {
      'permissions-policy':     headers.get('permissions-policy') === REQUIRED['permissions-policy'],
      'x-frame-options':        headers.get('x-frame-options') === REQUIRED['x-frame-options'],
      'x-content-type-options': headers.get('x-content-type-options') === REQUIRED['x-content-type-options'],
      'referrer-policy':        headers.get('referrer-policy') === REQUIRED['referrer-policy'],
      'content-security-policy': !!headers.get('content-security-policy'),
    };

    const allPass = Object.values(checks).every(Boolean);
    if (allPass) totalPass++; else totalFail++;

    const icon = k => checks[k] ? '✅' : '❌';
    console.log(
      `${route.padEnd(52)} ${icon('permissions-policy')}  ${icon('x-frame-options')} ${icon('x-content-type-options')}  ${icon('referrer-policy')} ${icon('content-security-policy')}`
    );

    for (const [key, pass] of Object.entries(checks)) {
      if (!pass) {
        const got = headers.get(key) ?? '(missing)';
        failures.push({ route, key, got, want: REQUIRED[key] ?? '(present)' });
      }
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log(`\nRoutes checked: ${ROUTES.length}  ✅ ${totalPass}  ❌ ${totalFail}`);

  if (failures.length) {
    console.log('\n--- Failures ---');
    for (const f of failures) {
      console.log(`  ${f.route}`);
      console.log(`    header : ${f.key}`);
      console.log(`    want   : ${f.want}`);
      console.log(`    got    : ${f.got}`);
    }
  } else {
    console.log('\n✅ All security headers present and correct on every route.');
  }
})();
