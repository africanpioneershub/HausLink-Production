const NAV = [
  ['/how-it-works', 'Features'],
  ['/about',        'About'],
  ['/contact',      'Contact'],
  ['/pricing',      'Pricing'],
  ['/terms',        'Terms'],
  ['/privacy',      'Privacy'],
];

const SUPPORT = [
  ['https://wa.me/250788937487',    'WhatsApp link'],
  ['afriprimeholdings@gmail.com',   'Email address'],
  ['+250788937487',                 'Phone number'],
  ['Kigali, Rwanda',                'Location'],
];

const SOCIAL = [
  ['facebook.com',  'Facebook'],
  ['x.com',         'Twitter/X'],
  ['instagram.com', 'Instagram'],
  ['linkedin.com',  'LinkedIn'],
  ['tiktok.com',    'TikTok'],
];

(async () => {
  const html = await fetch('https://hauselink.com/', { redirect: 'follow' }).then(r => r.text());

  let pass = 0, fail = 0;
  const check = (found, label) => {
    console.log((found ? '  ✅' : '  ❌') + ' ' + label);
    found ? pass++ : fail++;
  };

  console.log('\n--- Navigation links ---');
  for (const [href, label] of NAV) {
    check(html.includes('href="' + href + '"'), label + ' -> ' + href);
  }

  console.log('\n--- Support ---');
  for (const [val, label] of SUPPORT) {
    check(html.includes(val), label + ': ' + val);
  }

  console.log('\n--- Social icons ---');
  for (const [domain, label] of SOCIAL) {
    check(html.includes(domain), label);
  }

  console.log('\n' + (pass + fail) + ' checks   ✅ ' + pass + '   ❌ ' + fail);
  console.log(fail === 0 ? '\n✅ PASS' : '\n❌ FAIL — see above');
})();
