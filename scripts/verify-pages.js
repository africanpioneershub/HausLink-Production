process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE = 'https://hauselink.com';

async function getHtml(path) {
  const res = await fetch(BASE + path, { redirect: 'follow' });
  return { status: res.status, html: await res.text() };
}

function check(html, needle, label) {
  const ok = html.includes(needle);
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  return ok;
}

function absent(html, needle, label) {
  const found = html.includes(needle);
  console.log(`  ${found ? '❌ still present' : '✅ gone        '}: ${label}`);
  return !found;
}

(async () => {
  let pass = 0, fail = 0;
  const tally = (ok) => ok ? pass++ : fail++;

  // ── HOMEPAGE ──────────────────────────────────────────────
  console.log('\n=== Homepage (/) ===');
  const { status: hpStatus, html: hp } = await getHtml('/');
  console.log(`HTTP ${hpStatus}\n`);

  console.log('--- Present ---');
  tally(check(hp, 'Available Properties',         'Heading: "Available Properties"'));
  tally(check(hp, 'id="features"',                'id="features" anchor'));
  tally(check(hp, 'id="testimonials"',            'id="testimonials" anchor'));
  tally(check(hp, '>All<',                        'Filter tab: All'));
  tally(check(hp, '>Apartments<',                 'Filter tab: Apartments'));
  tally(check(hp, '>Houses<',                     'Filter tab: Houses'));
  tally(check(hp, '>Studios<',                    'Filter tab: Studios'));
  tally(check(hp, '>Rooms<',                      'Filter tab: Rooms'));
  tally(check(hp, '>Villas<',                     'Filter tab: Villas'));
  tally(check(hp, '>Office<',                     'Filter tab: Office'));
  tally(check(hp, 'What Our Users Say',           'Testimonials section'));
  tally(check(hp, 'Grow Your Rental Business',    'For Landlords section'));
  tally(check(hp, "&#x27;m a Tenant",              'Hero CTA: Tenant'));
  tally(check(hp, "&#x27;m a Landlord",            'Hero CTA: Landlord'));

  console.log('\n--- Removed ---');
  tally(absent(hp, 'PREMIUM PROPERTIES',          'Old tab: PREMIUM PROPERTIES'));
  tally(absent(hp, 'NEW LISTINGS',                'Old tab: NEW LISTINGS'));
  tally(absent(hp, 'MOST VIEWED',                 'Old tab: MOST VIEWED'));
  tally(absent(hp, 'VERIFIED LANDLORDS',          'Old tab: VERIFIED LANDLORDS'));
  tally(absent(hp, 'AFFORDABLE RENTALS',          'Old tab: AFFORDABLE RENTALS'));
  tally(absent(hp, 'STUDENT HOUSING',             'Old tab: STUDENT HOUSING'));
  tally(absent(hp, 'Featured Properties',         'Old heading: Featured Properties'));
  tally(absent(hp, 'Explore our most popular',    'Old subtitle'));
  tally(absent(hp, 'Verified Catalogs',           'Old label: Verified Catalogs'));
  tally(absent(hp, 'Available Rental Properties', 'Old heading: Available Rental Properties'));

  // ── FEATURES PAGE ─────────────────────────────────────────
  console.log('\n=== Features page (/how-it-works) ===');
  const { status: fStatus, html: fp } = await getHtml('/how-it-works');
  console.log(`HTTP ${fStatus}\n`);

  console.log('--- Present ---');
  tally(check(fp, 'Everything you need in one platform', 'Features grid heading'));
  tally(check(fp, 'Smart Property Search',               'Feature card: Smart Property Search'));
  tally(check(fp, 'Secure Rent Payments',                'Feature card: Secure Rent Payments'));
  tally(check(fp, 'Direct Messaging',                    'Feature card: Direct Messaging'));
  tally(check(fp, 'For Tenants',                         'Section: For Tenants'));
  tally(check(fp, 'For Landlords',                       'Section: For Landlords'));
  tally(check(fp, 'Find your home in 4 steps',           'Tenant flow heading'));
  tally(check(fp, 'Start earning in 4 steps',            'Landlord flow heading'));
  tally(check(fp, '>Register<',                          'Step: Register'));
  tally(check(fp, '>Browse<',                            'Step: Browse'));
  tally(check(fp, '>Apply<',                             'Step: Apply'));
  tally(check(fp, '>Move In<',                           'Step: Move In'));
  tally(check(fp, '>List<',                              'Step: List'));
  tally(check(fp, '>Verify<',                            'Step: Verify'));
  tally(check(fp, '>Earn<',                              'Step: Earn'));
  tally(check(fp, 'Why HausLink',                        'Section: Why HausLink'));

  console.log('\n--- Removed ---');
  tally(absent(fp, 'Step 1\n',                           'Old alternating steps layout'));
  tally(absent(fp, 'flex-row-reverse',                   'Old alternating layout CSS'));

  // ── SUMMARY ───────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Total: ${pass + fail} checks   ✅ ${pass}   ❌ ${fail}`);
  console.log(fail === 0 ? '\n✅ PASS — both pages live and correct' : '\n❌ FAIL — see above');
})();
