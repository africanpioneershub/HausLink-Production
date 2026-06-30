const { chromium } = require('playwright');
const path = require('path');

const BROWSERS_PATH = path.join(process.env.USERPROFILE, '.playwright-browsers');
const BASE_URL = 'https://hauselink.com';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
if (!DEMO_PASSWORD) {
  console.error('Missing DEMO_PASSWORD env var. Copy scripts/.env.scripts.example to scripts/.env.scripts and fill in values.');
  process.exit(1);
}

const ACCOUNTS = [
  {
    label: 'Landlord 1',
    email: process.env.DEMO_LANDLORD_EMAIL ?? 'landlord@hauselink.com',
    password: DEMO_PASSWORD,
    expectedRole: 'LANDLORD',
    checkUrl: '/landlord/dashboard',
    extraChecks: ['/landlord/properties'],
  },
  {
    label: 'Landlord 2',
    email: process.env.DEMO_LANDLORD2_EMAIL ?? 'landlord2@hauselink.com',
    password: DEMO_PASSWORD,
    expectedRole: 'LANDLORD',
    checkUrl: '/landlord/dashboard',
    extraChecks: [],
  },
  {
    label: 'Tenant',
    email: process.env.DEMO_TENANT_EMAIL ?? 'tenant@hauselink.com',
    password: DEMO_PASSWORD,
    expectedRole: 'TENANT',
    checkUrl: '/tenant/dashboard',
    extraChecks: ['/tenant/properties'],
  },
];

async function testAccount(browser, account) {
  console.log(`\n=== Testing ${account.label} (${account.email}) ===`);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  try {
    // 1. Load login page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  [1] Login page loaded: ${page.url()}`);

    // 2. Fill credentials
    await page.fill('input[type="email"]', account.email);
    await page.fill('input[type="password"]', account.password);
    console.log(`  [2] Credentials entered`);

    // 3. Submit
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
    const afterLoginUrl = page.url();
    console.log(`  [3] Redirected to: ${afterLoginUrl}`);

    // 4. Check we landed somewhere sensible (not back on login, not error page)
    if (afterLoginUrl.includes('/login')) {
      console.log(`  ❌ FAIL: Still on login page — credentials rejected`);
      return { label: account.label, pass: false, error: 'Still on login page after submit' };
    }

    // 5. Navigate to expected dashboard
    await page.goto(`${BASE_URL}${account.checkUrl}`, { waitUntil: 'networkidle', timeout: 20000 });
    const dashUrl = page.url();
    console.log(`  [4] Dashboard URL: ${dashUrl}`);

    // Check we weren't bounced back to login or unauthorized
    if (dashUrl.includes('/login') || dashUrl.includes('/unauthorized')) {
      console.log(`  ❌ FAIL: Bounced to ${dashUrl}`);
      return { label: account.label, pass: false, error: `Bounced to ${dashUrl}` };
    }

    // 6. Check for JS errors on dashboard
    if (errors.length > 0) {
      console.log(`  ⚠️  JS errors on page: ${errors.join('; ')}`);
    }

    // 7. Check page has real content (not blank)
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    const hasContent = bodyText.length > 100;
    console.log(`  [5] Dashboard has content: ${hasContent} (${bodyText.length} chars)`);

    // 8. Extra checks (properties page etc.)
    for (const extraPath of account.extraChecks) {
      errors.length = 0;
      await page.goto(`${BASE_URL}${extraPath}`, { waitUntil: 'networkidle', timeout: 20000 });
      const extraUrl = page.url();
      const bounced = extraUrl.includes('/login') || extraUrl.includes('/unauthorized');
      console.log(`  [6] ${extraPath}: ${bounced ? '❌ bounced' : '✅ loaded'} → ${extraUrl}`);

      // For landlord properties page, count property entries
      if (extraPath === '/landlord/properties') {
        const propCount = await page.evaluate(() => {
          // Look for property rows or cards - count elements that look like listings
          const cards = document.querySelectorAll('[class*="rounded"][class*="border"]');
          return cards.length;
        });
        console.log(`     Property-like elements on page: ${propCount}`);
        const pageText = await page.evaluate(() => document.body.innerText);
        const hasProperties = /kiyovu|kimihurura|remera|nyarutarama|studio|villa|apartment|house/i.test(pageText);
        console.log(`     Contains property names: ${hasProperties}`);
      }

      if (extraPath === '/tenant/properties') {
        const pageText = await page.evaluate(() => document.body.innerText);
        const hasListings = /rwf|bedroom|kigali/i.test(pageText);
        console.log(`     Tenant properties page shows listings: ${hasListings}`);
      }

      if (extraPath === '/landlord/properties' && errors.length > 0) {
        console.log(`     ⚠️  JS errors: ${errors.join('; ')}`);
      }
    }

    console.log(`  ✅ PASS: ${account.label} login and dashboard work`);
    return { label: account.label, pass: true };

  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
    return { label: account.label, pass: false, error: err.message };
  } finally {
    await context.close();
  }
}

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH = BROWSERS_PATH;

  const browser = await chromium.launch({
    headless: true,
    executablePath: path.join(BROWSERS_PATH, 'chromium-1228', 'chrome-win64', 'chrome.exe'),
  });

  const results = [];
  for (const account of ACCOUNTS) {
    const result = await testAccount(browser, account);
    results.push(result);
  }

  await browser.close();

  console.log('\n========= SUMMARY =========');
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    console.log(`${icon} ${r.label}${r.error ? ': ' + r.error : ''}`);
  }
  const allPass = results.every((r) => r.pass);
  console.log(`\nOverall: ${allPass ? 'ALL PASS' : 'SOME FAILED'}`);
})();
