process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE = 'https://www.hauselink.com';

(async () => {
  console.log('=== DIMENSION 1 — PAGE AVAILABILITY ===\n');

  const pages = [
    ['Homepage',        '/'],
    ['Properties',      '/properties'],
    ['Pricing',         '/pricing'],
    ['FAQ',             '/faq'],
    ['Contact',         '/contact'],
    ['How it Works',    '/how-it-works'],
    ['Privacy',         '/privacy'],
    ['Terms',           '/terms'],
    ['Register',        '/register'],
    ['Login',           '/login'],
    ['Forgot Password', '/forgot-password'],
    // Auth-guarded pages should redirect (not 200, not 500)
    ['Tenant Dashboard (guarded)', '/tenant/dashboard'],
    ['Landlord Dashboard (guarded)', '/landlord/dashboard'],
    ['Admin Dashboard (guarded)',   '/admin/dashboard'],
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, path] of pages) {
    try {
      const res = await fetch(BASE + path, { redirect: 'follow' });
      const isGuarded = name.includes('guarded');
      // Guarded pages should NOT be 200 (should redirect to /login or /unauthorized)
      let ok;
      let note = '';
      if (isGuarded) {
        ok = res.status !== 500 && res.url !== BASE + path;
        note = ` (redirected to ${res.url.replace(BASE, '')})`;
      } else {
        ok = res.status === 200;
      }
      console.log(`${ok ? '✅' : '❌'} ${name.padEnd(30)} → ${res.status}${note}`);
      ok ? passed++ : failed++;
    } catch (e) {
      console.log(`❌ ${name.padEnd(30)} → ERROR: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nPages: ${passed}/${passed + failed} passed`);
})();
