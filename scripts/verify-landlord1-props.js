const { chromium } = require('playwright');
const path = require('path');

const BROWSERS_PATH = path.join(process.env.USERPROFILE, '.playwright-browsers');
const BASE_URL = 'https://www.hauselink.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tmp-screenshots');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: path.join(BROWSERS_PATH, 'chromium-1228', 'chrome-win64', 'chrome.exe'),
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Capture all console messages and network responses
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'landlord@hauselink.com');
  await page.fill('input[type="password"]', 'HausLink@Demo2026!');
  await page.click('button[type="submit"]');
  console.log('Submit clicked. Waiting 8s...');

  await page.waitForTimeout(8000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '4-after-submit-2.png'), fullPage: true });
  console.log(`URL after 8s: ${page.url()}`);

  const bodyText = await page.evaluate(() => document.body.innerText.trim());
  console.log(`Body: ${bodyText.slice(0, 500).replace(/\n+/g, ' ')}`);

  // Look for any visible error/warning text
  const alertText = await page.evaluate(() => {
    const els = document.querySelectorAll('[role="alert"], [class*="error"], [class*="Error"], [class*="toast"], [class*="Toast"]');
    return Array.from(els).map(e => e.innerText.trim()).filter(Boolean);
  });
  if (alertText.length) console.log(`Alerts/errors: ${alertText.join(' | ')}`);

  // Console messages from browser
  const errors = consoleMessages.filter(m => m.startsWith('error'));
  if (errors.length) console.log(`Console errors: ${errors.join('\n')}`);

  await browser.close();
  console.log(`Screenshot: ${SCREENSHOT_DIR}/4-after-submit-2.png`);
})();
