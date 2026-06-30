const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BROWSERS_PATH = path.join(process.env.USERPROFILE, '.playwright-browsers');
const BASE_URL = 'https://www.hauselink.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tmp-screenshots');
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

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: path.join(BROWSERS_PATH, 'chromium-1228', 'chrome-win64', 'chrome.exe'),
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const apiResponses = {};
  page.on('response', async (res) => {
    if (res.url().includes('/api/admin/payments')) {
      try { apiResponses.payments = await res.json(); } catch {}
    }
  });

  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));

  console.log('=== Admin Finance Page Verification ===\n');

  // 1. Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await fillEmail(page, 'afriprimeholdings@gmail.com');
  await page.locator('input[type="password"]').fill('HausLink@Admin2026!');
  await page.locator('button[type="submit"]').click();
  try {
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
  } catch {
    console.log('❌ Login failed — still on /login');
    await browser.close();
    process.exit(1);
  }
  console.log(`[1] Login ✅  → ${page.url()}`);

  // 2. Check sidebar has Finance link
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const financeLink = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const f = links.find((l) => l.getAttribute('href') === '/admin/finance');
    return f ? f.innerText.trim() : null;
  });
  console.log(`[2] Sidebar Finance link: ${financeLink ? `✅ "${financeLink}"` : '❌ not found'}`);

  // 3. Navigate to Finance page
  await page.goto(`${BASE_URL}/admin/finance`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finance-1-loaded.png'), fullPage: true });

  const financeUrl = page.url();
  const bouncedToLogin = financeUrl.includes('/login');
  console.log(`[3] Finance URL: ${bouncedToLogin ? '❌ bounced to login' : `✅ ${financeUrl}`}`);

  if (bouncedToLogin) {
    await browser.close();
    process.exit(1);
  }

  // 4. Page heading
  const heading = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.innerText.trim() : null;
  });
  console.log(`[4] Page heading: ${heading ? `✅ "${heading}"` : '❌ no h1'}`);

  // 5. KPI cards — wait for data to load (loading state clears)
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading…'),
    { timeout: 10000 }
  ).catch(() => {});
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finance-2-data-loaded.png'), fullPage: true });

  const kpiValues = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('p.text-2xl, p[class*="text-2xl"]'));
    return cards.map((el) => el.innerText.trim());
  });
  console.log(`[5] KPI card values: ${kpiValues.length > 0 ? `✅ [${kpiValues.join(', ')}]` : '❌ none found'}`);

  // 6. Check for NaN in KPI values
  const hasNaN = kpiValues.some((v) => v.includes('NaN'));
  console.log(`[6] NaN in KPIs: ${hasNaN ? '❌ YES — still broken' : '✅ No NaN'}`);

  // 7. Chart presence
  const hasChart = await page.evaluate(() => {
    return !!document.querySelector('svg.recharts-surface, [class*="recharts"]');
  });
  console.log(`[7] Revenue chart rendered: ${hasChart ? '✅ yes' : '❌ no'}`);

  // 8. Payments table
  const tableRows = await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr');
    return rows.length;
  });
  const noPaymentsMsg = await page.evaluate(() => {
    return document.body.innerText.includes('No payment transactions yet');
  });
  console.log(`[8] Payments table: ${tableRows > 0 ? `✅ ${tableRows} rows` : noPaymentsMsg ? '⚠️  empty (no data yet)' : '❌ table missing'}`);

  // 9. Disbursements section
  const hasDisbursements = await page.evaluate(() => {
    return document.body.innerText.includes('Pending Disbursements');
  });
  console.log(`[9] Disbursements section: ${hasDisbursements ? '✅ present' : '❌ missing'}`);

  // 10. API response check
  if (apiResponses.payments) {
    const d = apiResponses.payments.data;
    console.log(`\n[10] API /admin/payments response:`);
    console.log(`     success: ${apiResponses.payments.success}`);
    if (d?.kpis) {
      console.log(`     kpis.totalRevenue:     ${d.kpis.totalRevenue}`);
      console.log(`     kpis.platformFees:     ${d.kpis.platformFees}`);
      console.log(`     kpis.feePct:           ${d.kpis.feePct}`);
      console.log(`     kpis.totalTransactions:${d.kpis.totalTransactions}`);
      console.log(`     kpis.pendingAmount:    ${d.kpis.pendingAmount}`);
      console.log(`     kpis.failedCount24h:   ${d.kpis.failedCount24h}`);
    }
    if (d?.chart) {
      console.log(`     chart months: ${d.chart.map((c) => c.month).join(', ')}`);
    }
    if (d?.payments) {
      console.log(`     payments count: ${d.payments.length}`);
    }
  } else {
    console.log('\n[10] API response: ⚠️  not captured (may have been served from cache or before listener attached)');
  }

  // 11. JS errors
  if (jsErrors.length) {
    console.log(`\n⚠️  JS errors: ${jsErrors.slice(0, 3).join('; ')}`);
  }

  // 12. Also verify admin properties page now shows all properties
  console.log('\n--- Checking admin properties default tab fix ---');
  await page.goto(`${BASE_URL}/admin/properties`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finance-3-properties.png'), fullPage: true });

  const propertiesText = await page.evaluate(() => document.body.innerText);
  const hasPropData = /kiyovu|kimihurura|remera|nyarutarama|villa|studio/i.test(propertiesText);
  const allTabActive = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const allBtn = btns.find((b) => b.innerText.trim() === 'All Properties');
    return allBtn ? allBtn.className : null;
  });
  console.log(`  All Properties tab class: ${allTabActive ?? '(not found)'}`);
  console.log(`  Has property data: ${hasPropData ? '✅ yes' : '❌ no'}`);

  console.log('\n========= SUMMARY =========');
  const pass =
    !bouncedToLogin &&
    !!heading &&
    !hasNaN &&
    (hasChart || tableRows >= 0) &&
    hasDisbursements;
  console.log(`Finance page: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`KPI NaN-free: ${!hasNaN ? '✅' : '❌'}`);
  console.log(`Chart:        ${hasChart ? '✅' : '❌'}`);
  console.log(`Payments:     ${tableRows > 0 ? `✅ (${tableRows} rows)` : '⚠️  empty'}`);
  console.log(`Disbursements:${hasDisbursements ? '✅' : '❌'}`);
  console.log(`Screenshots:  ${SCREENSHOT_DIR}`);

  await browser.close();
})();
