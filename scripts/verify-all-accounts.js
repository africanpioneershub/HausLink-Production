const { chromium } = require('playwright');
const path = require('path');

const BROWSERS_PATH = path.join(process.env.USERPROFILE, '.playwright-browsers');
const BASE_URL = 'https://www.hauselink.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tmp-screenshots');

const fs = require('fs');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const ACCOUNTS = [
  {
    label: 'Landlord 1',
    email: 'landlord@hauselink.com',
    password: 'HausLink@Demo2026!',
    dashPath: '/landlord/dashboard',
    propsPath: '/landlord/properties',
    propKeywords: ['Kiyovu', 'Kimihurura', 'Remera', 'Nyarutarama'],
  },
  {
    label: 'Landlord 2',
    email: 'landlord2@hauselink.com',
    password: 'HausLink@Demo2026!',
    dashPath: '/landlord/dashboard',
    propsPath: null,
  },
  {
    label: 'Tenant',
    email: 'tenant@hauselink.com',
    password: 'HausLink@Demo2026!',
    dashPath: '/tenant/dashboard',
    propsPath: '/tenant/properties',
    propKeywords: ['RWF', 'Kigali'],
  },
];

async function fillEmail(page, email) {
  // Click the email field first, triple-click to select all, then type
  const emailInput = page.locator('input[type="email"]');
  await emailInput.click({ clickCount: 3 });
  await emailInput.pressSequentially(email, { delay: 30 });

  // Verify it took
  const value = await emailInput.inputValue();
  if (value !== email) {
    // Fallback: evaluate directly to set React-compatible value
    await page.evaluate((val) => {
      const input = document.querySelector('input[type="email"]');
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, email);
  }
}

async function testAccount(browser, account, idx) {
  console.log(`\n=== ${account.label} (${account.email}) ===`);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));

  try {
    // 1. Login page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log(`  [1] Login page loaded`);

    // 2. Fill email (React-compatible)
    await fillEmail(page, account.email);
    const emailVal = await page.locator('input[type="email"]').inputValue();
    console.log(`  [2] Email field value: "${emailVal}"`);

    // 3. Fill password
    await page.locator('input[type="password"]').click();
    await page.locator('input[type="password"]').fill(account.password);

    // 4. Screenshot before submit
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${idx}a-before-submit.png`), fullPage: true });

    // 5. Submit and wait for navigation away from login
    await page.locator('button[type="submit"]').click();
    try {
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    } catch {
      // Check if there's a visible error
      const errText = await page.evaluate(() => {
        const el = document.querySelector('[class*="text-red"], [class*="error"], [role="alert"]');
        return el ? el.innerText.trim() : null;
      });
      const bodySnip = await page.evaluate(() => document.body.innerText.trim().slice(0, 200));
      console.log(`  ❌ Still on login. Error: ${errText ?? '(none)'}. Body: ${bodySnip}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${idx}b-login-fail.png`), fullPage: true });
      return { label: account.label, pass: false, error: errText ?? 'Login timed out' };
    }

    const postLoginUrl = page.url();
    console.log(`  [3] Post-login URL: ${postLoginUrl}`);

    // 6. Wait for dashboard to fully load
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${idx}c-dashboard.png`), fullPage: true });

    const dashText = await page.evaluate(() => document.body.innerText.trim());
    console.log(`  [4] Dashboard content (first 300): ${dashText.slice(0, 300).replace(/\n+/g, ' ')}`);

    const bounced = postLoginUrl.includes('/login') || postLoginUrl.includes('/unauthorized');
    if (bounced) {
      return { label: account.label, pass: false, error: `Bounced to ${postLoginUrl}` };
    }

    // 7. Check properties page if applicable
    if (account.propsPath) {
      await page.goto(`${BASE_URL}${account.propsPath}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${idx}d-properties.png`), fullPage: true });

      const propsUrl = page.url();
      const propsBounced = propsUrl.includes('/login') || propsUrl.includes('/unauthorized');
      const propsText = await page.evaluate(() => document.body.innerText.trim());

      console.log(`  [5] Properties page: ${propsBounced ? '❌ bounced' : '✅ loaded'} → ${propsUrl}`);

      if (account.propKeywords) {
        const found = account.propKeywords.filter(k => propsText.includes(k));
        console.log(`      Keywords found: ${found.length > 0 ? found.join(', ') : 'none'}`);
      }
    }

    if (jsErrors.length) console.log(`  ⚠️  JS errors: ${jsErrors.slice(0, 3).join('; ')}`);
    console.log(`  ✅ PASS`);
    return { label: account.label, pass: true };

  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message.split('\n')[0]}`);
    return { label: account.label, pass: false, error: err.message.split('\n')[0] };
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
  for (let i = 0; i < ACCOUNTS.length; i++) {
    results.push(await testAccount(browser, ACCOUNTS[i], i + 1));
  }

  await browser.close();

  console.log('\n\n========= FINAL SUMMARY =========');
  for (const r of results) {
    console.log(`${r.pass ? '✅' : '❌'} ${r.label}${r.error ? ': ' + r.error : ''}`);
  }
  console.log(`\nOverall: ${results.every(r => r.pass) ? 'ALL PASS ✅' : 'SOME FAILED ❌'}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);
})();
