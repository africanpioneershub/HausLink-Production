const { chromium } = require('playwright');
const path = require('path');

const BROWSERS_PATH = path.join(process.env.USERPROFILE, '.playwright-browsers');
const BASE_URL = 'https://www.hauselink.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tmp-screenshots');

const fs = require('fs');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
if (!DEMO_PASSWORD) {
  console.error('Missing DEMO_PASSWORD env var. Copy scripts/.env.scripts.example to scripts/.env.scripts and fill in values.');
  process.exit(1);
}
const DEMO_LANDLORD_EMAIL = process.env.DEMO_LANDLORD_EMAIL ?? 'landlord@hauselink.com';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: path.join(BROWSERS_PATH, 'chromium-1228', 'chrome-win64', 'chrome.exe'),
  });

  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  console.log('=== Testing Landlord 1 (landlord@hauselink.com) ===');

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  console.log(`[1] Login page loaded: ${page.url()}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '1-login-page.png'), fullPage: true });

  await page.fill('input[type="email"]', DEMO_LANDLORD_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASSWORD);
  console.log('[2] Credentials entered');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '2-filled.png'), fullPage: true });
  await page.click('button[type="submit"]');
  console.log('[3] Submit clicked, waiting 5s...');

  // Wait a fixed 5s and see what URL we're on
  await page.waitForTimeout(5000);
  const urlAfter = page.url();
  console.log(`[4] URL after 5s: ${urlAfter}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '3-after-submit.png'), fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText.trim());
  console.log(`[5] Page text (first 400 chars): ${bodyText.slice(0, 400).replace(/\n+/g, ' ')}`);

  // If still on login, look for error messages
  if (urlAfter.includes('/login')) {
    const errorText = await page.evaluate(() => {
      const selectors = ['[class*="error"]', '[class*="alert"]', '[role="alert"]', 'p[class*="red"]', 'p[class*="text-red"]'];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el.innerText;
      }
      return null;
    });
    console.log(`[6] Error on page: ${errorText ?? '(none found with standard selectors)'}`);

    // Check all form elements
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type, name: i.name, value: i.value ? '[filled]' : '[empty]'
      }));
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        type: b.type, text: b.innerText.trim().slice(0,30), disabled: b.disabled
      }));
      return { inputs, buttons };
    });
    console.log(`[7] Form inputs: ${JSON.stringify(formInfo.inputs)}`);
    console.log(`    Buttons: ${JSON.stringify(formInfo.buttons)}`);
  }

  await browser.close();
  console.log(`\nScreenshots saved to: ${SCREENSHOT_DIR}`);
})();
