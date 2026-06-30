const { chromium } = require('playwright');
const path = require('path');

const BROWSERS_PATH = path.join(process.env.USERPROFILE, '.playwright-browsers');
const BASE_URL = 'https://www.hauselink.com';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
if (!DEMO_PASSWORD) {
  console.error('Missing DEMO_PASSWORD env var. Copy scripts/.env.scripts.example to scripts/.env.scripts and fill in values.');
  process.exit(1);
}
const DEMO_LANDLORD_EMAIL = process.env.DEMO_LANDLORD_EMAIL ?? 'landlord@hauselink.com';

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
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]');
  await fillEmail(page, DEMO_LANDLORD_EMAIL);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

  await page.goto(`${BASE_URL}/landlord/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForFunction(() => !document.body.innerText.includes('Loading…'), { timeout: 8000 }).catch(() => {});

  const bodyText = await page.evaluate(() => document.body.innerText.trim());
  console.log('=== Landlord Dashboard — full page text ===\n');
  console.log(bodyText);

  if (jsErrors.length) console.log(`\nJS errors: ${jsErrors.join('; ')}`);
  await browser.close();
})();
