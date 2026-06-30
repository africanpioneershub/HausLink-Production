const { chromium } = require('playwright');
const path = require('path');

const BROWSERS_PATH = path.join(process.env.USERPROFILE, '.playwright-browsers');
const BASE_URL = 'https://www.hauselink.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tmp-screenshots');

const fs = require('fs');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function fillEmail(page, email) {
  const emailInput = page.locator('input[type="email"]');
  await emailInput.click({ clickCount: 3 });
  await emailInput.pressSequentially(email, { delay: 30 });
  const value = await emailInput.inputValue();
  if (value !== email) {
    await page.evaluate((val) => {
      const input = document.querySelector('input[type="email"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, email);
  }
}

const ADMIN_PAGES = [
  { label: 'Dashboard',       path: '/admin/dashboard' },
  { label: 'Properties',      path: '/admin/properties' },
  { label: 'Users',           path: '/admin/users' },
  { label: 'Finance',         path: '/admin/finance' },
  { label: 'Reports',         path: '/admin/reports' },
  { label: 'Settings',        path: '/admin/settings' },
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: path.join(BROWSERS_PATH, 'chromium-1228', 'chrome-win64', 'chrome.exe'),
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));

  console.log('=== Admin Login (afriprimeholdings@gmail.com) ===\n');

  // 1. Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await fillEmail(page, 'afriprimeholdings@gmail.com');
  const emailVal = await page.locator('input[type="email"]').inputValue();
  console.log(`[1] Email field: "${emailVal}"`);

  await page.locator('input[type="password"]').fill('HausLink@Admin2026!');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-1-filled.png'), fullPage: true });

  await page.locator('button[type="submit"]').click();
  try {
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  } catch {
    const bodySnip = await page.evaluate(() => document.body.innerText.trim().slice(0, 300));
    console.log(`❌ Still on login. Body: ${bodySnip}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-1-fail.png'), fullPage: true });
    await browser.close();
    process.exit(1);
  }

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const postLoginUrl = page.url();
  console.log(`[2] Post-login URL: ${postLoginUrl}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-2-dashboard.png'), fullPage: true });

  const dashText = await page.evaluate(() => document.body.innerText.trim());
  console.log(`[3] Dashboard content (first 400):\n    ${dashText.slice(0, 400).replace(/\n+/g, ' ')}\n`);

  // 2. Check sidebar user identity
  const sidebarName = await page.evaluate(() => {
    const el = document.querySelector('[class*="sidebar"] [class*="name"], aside [class*="name"], nav [class*="font-bold"]');
    return el ? el.innerText.trim() : null;
  });
  console.log(`[4] Sidebar identity: ${sidebarName ?? '(check screenshot)'}`);

  // 3. Walk every admin sub-page
  console.log('\n--- Checking admin sub-pages ---');
  const pageResults = [];
  for (const ap of ADMIN_PAGES) {
    const jsPageErrors = [];
    page.on('pageerror', e => jsPageErrors.push(e.message));

    await page.goto(`${BASE_URL}${ap.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    const url = page.url();
    const bounced = url.includes('/login') || url.includes('/unauthorized');
    const text = await page.evaluate(() => document.body.innerText.trim());
    const hasContent = text.length > 80 && !bounced;

    const slug = ap.label.toLowerCase().replace(/\W/g, '-');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `admin-page-${slug}.png`), fullPage: true });

    const status = bounced ? '❌ BOUNCED' : hasContent ? '✅ OK' : '⚠️  thin';
    console.log(`  ${status}  ${ap.label.padEnd(14)} → ${url}`);
    if (jsPageErrors.length) console.log(`         ⚠️  JS errors: ${jsPageErrors.slice(0,2).join('; ')}`);

    // Extract key KPI numbers from dashboard
    if (ap.path === '/admin/dashboard') {
      const numbers = text.match(/\d[\d,]*/g)?.slice(0, 8) ?? [];
      console.log(`         KPIs found: ${numbers.join(', ')}`);
    }
    if (ap.path === '/admin/properties') {
      const hasPropData = /kiyovu|kimihurura|remera|nyarutarama|villa|studio/i.test(text);
      console.log(`         Has property data: ${hasPropData}`);
    }
    if (ap.path === '/admin/users') {
      const hasUserData = /landlord|tenant|admin/i.test(text);
      console.log(`         Has user data: ${hasUserData}`);
    }

    pageResults.push({ label: ap.label, pass: !bounced && hasContent });
  }

  if (jsErrors.length) {
    console.log(`\n⚠️  Global JS errors across session: ${jsErrors.slice(0,3).join('; ')}`);
  }

  console.log('\n========= SUMMARY =========');
  console.log(`Login: ✅  (redirected to ${postLoginUrl})`);
  for (const r of pageResults) {
    console.log(`${r.pass ? '✅' : '❌'} ${r.label}`);
  }
  const allPass = pageResults.every(r => r.pass);
  console.log(`\nOverall: ${allPass ? 'ALL PASS ✅' : 'SOME ISSUES ❌'}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);

  await browser.close();
})();
