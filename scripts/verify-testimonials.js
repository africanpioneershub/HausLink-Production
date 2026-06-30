(async () => {
  const [tRes, hpRes] = await Promise.all([
    fetch('https://hauselink.com/testimonials', { redirect: 'follow' }),
    fetch('https://hauselink.com/', { redirect: 'follow' }),
  ]);
  const [th, hp] = await Promise.all([tRes.text(), hpRes.text()]);

  const checks = [
    // /testimonials page
    [tRes.status === 200,                         '/testimonials returns 200'],
    [th.includes('What Our Users Say'),           '/testimonials has heading'],
    [th.includes('Uwimana Alice'),                '/testimonials has testimonial cards'],
    [th.includes('Get Started Free'),             '/testimonials has CTA button'],
    [!th.includes('Available Properties'),        '/testimonials has NO properties section'],
    [!th.includes('key="APARTMENT"') && !th.includes('>Apartments<'), '/testimonials has NO filter tabs'],

    // Nav on homepage
    [hp.includes('href="/testimonials"'),         'Header nav Testimonials -> /testimonials'],
    [!hp.includes('href="/#testimonials"'),       'Old /#testimonials gone from nav'],

    // Homepage still has testimonials
    [hp.includes('id="testimonials"'),            'Homepage keeps id=testimonials anchor'],
    [hp.includes('What Our Users Say'),           'Homepage keeps testimonials heading'],
    [hp.includes('Uwimana Alice'),                'Homepage keeps testimonial cards'],
  ];

  console.log('\n--- /testimonials page ---');
  checks.slice(0, 6).forEach(([ok, label]) => console.log((ok ? '  ✅' : '  ❌') + ' ' + label));

  console.log('\n--- Header nav ---');
  checks.slice(6, 8).forEach(([ok, label]) => console.log((ok ? '  ✅' : '  ❌') + ' ' + label));

  console.log('\n--- Homepage testimonials (kept) ---');
  checks.slice(8).forEach(([ok, label]) => console.log((ok ? '  ✅' : '  ❌') + ' ' + label));

  const failed = checks.filter(([ok]) => !ok).length;
  console.log('\n' + checks.length + ' checks   ✅ ' + (checks.length - failed) + '   ❌ ' + failed);
  console.log(failed === 0 ? '\n✅ PASS' : '\n❌ FAIL');
})();
