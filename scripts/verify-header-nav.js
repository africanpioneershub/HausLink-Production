const EXPECTED = [
  ['Home',         '/'],
  ['Features',     '/how-it-works'],
  ['Testimonials', '/#testimonials'],
  ['Pricing',      '/pricing'],
  ['About',        '/about'],
  ['Contact',      '/contact'],
  ['FAQ',          '/faq'],
];

const REMOVED = [
  'href="/#features"',
  '>Testimonial<',
];

(async () => {
  console.log('Fetching https://hauselink.com/ ...\n');
  const res = await fetch('https://hauselink.com/', { redirect: 'follow' });
  const html = await res.text();

  console.log(`HTTP ${res.status} — ${html.length} bytes\n`);
  console.log('--- Expected nav links ---');

  let pass = 0, fail = 0;
  for (const [label, href] of EXPECTED) {
    const hrefPresent  = html.includes(`href="${href}"`);
    const labelPresent = html.includes(`>${label}<`);
    const ok = hrefPresent && labelPresent;
    const notes = [
      !hrefPresent  && '← href missing',
      !labelPresent && '← label missing',
    ].filter(Boolean).join('  ');
    console.log(`  ${ok ? '✅' : '❌'} ${label.padEnd(14)} href="${href}"${notes ? '  ' + notes : ''}`);
    ok ? pass++ : fail++;
  }

  console.log('\n--- Removed links (must be gone) ---');
  for (const s of REMOVED) {
    const found = html.includes(s);
    console.log(`  ${found ? '❌ still present' : '✅ gone         '}: ${s}`);
    if (found) fail++;
  }

  console.log(`\n${pass}/7 nav links live. ${fail === 0 ? '✅ PASS' : '❌ FAIL — ' + fail + ' issue(s)'}`);
})();
