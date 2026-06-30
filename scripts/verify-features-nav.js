process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

(async () => {
  const res = await fetch('https://hauselink.com/', { redirect: 'follow' });
  const html = await res.text();

  const checks = [
    ['Features href -> /how-it-works',  html.includes('href="/how-it-works"')],
    ['Features label present',          html.includes('>Features<')],
    ['/#features gone from nav',        !html.includes('href="/#features"')],
    ['id="properties" on props section',html.includes('id="properties"')],
    ['id="features" on landlords section', html.includes('id="features"')],
  ];

  checks.forEach(([label, ok]) => console.log((ok ? '✅' : '❌') + ' ' + label));
  const all = checks.every(([, ok]) => ok);
  console.log(all ? '\n✅ PASS' : '\n❌ FAIL');
})();
