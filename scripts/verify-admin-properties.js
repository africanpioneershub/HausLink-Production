const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BROWSERS_PATH = path.join(process.env.USERPROFILE, '.playwright-browsers');
const BASE_URL = 'https://www.hauselink.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tmp-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD env vars. Copy scripts/.env.scripts.example to scripts/.env.scripts and fill in values.');
  process.exit(1);
}

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

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: path.join(BROWSERS_PATH, 'chromium-1228', 'chrome-win64', 'chrome.exe'),
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const jsErrors = [];
  const apiCalls = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));
  page.on('request', (req) => {
    if (req.url().includes('/api/admin/')) apiCalls.push(req.url());
  });

  console.log('=== Admin Properties Verification ===\n');

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await fillEmail(page, ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
  console.log(`[1] Login ✅ → ${page.url()}`);

  // Navigate to properties
  await page.goto(`${BASE_URL}/admin/properties`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

  // Click Property Approvals tab
  await page.locator('button', { hasText: 'Property Approvals' }).click();

  // Wait for the properties API call to complete
  const propsResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/admin/properties'),
    { timeout: 10000 }
  ).catch(() => null);
  const propsResponse = await propsResponsePromise;

  if (propsResponse) {
    let propsJson;
    try { propsJson = await propsResponse.json(); } catch {}
    if (propsJson) {
      console.log(`[2] API /api/admin/properties:`);
      console.log(`    status: ${propsResponse.status()}`);
      console.log(`    success: ${propsJson.success}`);
      if (propsJson.data?.properties) {
        console.log(`    properties count: ${propsJson.data.properties.length}`);
        propsJson.data.properties.forEach((p, i) =>
          console.log(`    ${i+1}. ${p.title} (${p.status}) — ${p.district}, ${p.city}`)
        );
      }
      if (propsJson.data?.kpis) {
        console.log(`    kpis: ${JSON.stringify(propsJson.data.kpis)}`);
      }
    }
  } else {
    // Maybe it was already fetched on mount — check what API calls happened
    console.log(`[2] API calls so far: ${apiCalls.join(', ') || '(none)'}`);
  }

  // Wait a bit more for React to render
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'props-after-tab-click.png'), fullPage: true });

  // Get full page text
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log(`\n[3] Page text after tab click (first 600):\n    ${bodyText.slice(0, 600).replace(/\n+/g, ' ')}`);

  // Count all rounded-xl cards
  const allCards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div.rounded-xl'))
      .map((el) => el.innerText.trim().slice(0, 80))
      .filter((t) => t.length > 10);
  });
  console.log(`\n[4] All rounded-xl divs (${allCards.length}):`);
  allCards.slice(0, 10).forEach((c, i) => console.log(`    ${i+1}. ${c}`));

  // Active status filter button
  const activeFilter = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns
      .filter((b) => b.className.includes('bg-brand-navy') || b.className.includes('bg-blue'))
      .map((b) => b.innerText.trim());
  });
  console.log(`\n[5] Active-styled buttons: ${JSON.stringify(activeFilter)}`);

  // Look for "no properties" message
  const emptyMsg = bodyText.includes('No properties') || bodyText.includes('no properties');
  console.log(`[6] "No properties" message: ${emptyMsg ? '⚠️  YES' : 'no'}`);

  // Known property name scan
  const KNOWN = ['Kiyovu', 'Kimihurura', 'Remera', 'Nyarutarama', 'Gasabo', 'Kicukiro'];
  const foundNames = KNOWN.filter((n) => bodyText.includes(n));
  console.log(`[7] Known names in page: ${foundNames.length > 0 ? foundNames.join(', ') : 'none'}`);

  if (jsErrors.length) console.log(`\n⚠️  JS errors: ${jsErrors.slice(0, 3).join('; ')}`);

  console.log(`\nScreenshots: ${SCREENSHOT_DIR}/props-after-tab-click.png`);
  await browser.close();
})();
