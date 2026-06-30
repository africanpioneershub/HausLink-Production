const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BROWSERS_PATH = path.join(process.env.USERPROFILE, '.playwright-browsers');
const BASE_URL = 'https://www.hauselink.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tmp-screenshots', 'admin-full');
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

const ADMIN_PAGES = [
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    checks: {
      keywords: ['Total Users', 'Total Properties', 'Platform Revenue', 'Pending KYC'],
      noNaN: true,
      noEmpty: true,
    },
  },
  {
    label: 'Properties & KYC',
    path: '/admin/properties',
    checks: {
      keywords: ['KYC Verifications', 'Property Approvals', 'Pending Verification'],
      tabs: ['Property Approvals'],       // tabs to click and check
    },
  },
  {
    label: 'User Management',
    path: '/admin/users',
    checks: {
      keywords: ['landlord', 'tenant', 'admin'],
      noEmpty: true,
    },
  },
  {
    label: 'Applications',
    path: '/admin/applications',
    checks: {},
  },
  {
    label: 'Tenancies',
    path: '/admin/tenancies',
    checks: {},
  },
  {
    label: 'Payments',
    path: '/admin/payments',
    checks: {},
  },
  {
    label: 'Finance',
    path: '/admin/finance',
    checks: {
      keywords: ['Finance & Revenue', 'Total Revenue', 'Platform Fees', 'Pending Payouts'],
      noNaN: true,
    },
  },
  {
    label: 'Maintenance',
    path: '/admin/maintenance',
    checks: {},
  },
  {
    label: 'Messages',
    path: '/admin/messages',
    checks: {},
  },
  {
    label: 'Analytics',
    path: '/admin/analytics',
    checks: {},
  },
  {
    label: 'Reports & Flags',
    path: '/admin/reports',
    checks: {},
  },
  {
    label: 'Audit Log',
    path: '/admin/audit-log',
    checks: {},
  },
  {
    label: 'Settings',
    path: '/admin/settings',
    checks: {},
  },
];

function slug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: path.join(BROWSERS_PATH, 'chromium-1228', 'chrome-win64', 'chrome.exe'),
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const allJsErrors = [];
  page.on('pageerror', (e) => allJsErrors.push({ url: page.url(), msg: e.message }));

  console.log('=== Full Admin Walkthrough ===\n');

  // ── Login ──────────────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await fillEmail(page, ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  try {
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
  } catch {
    console.log('❌ Login failed — aborting');
    await browser.close();
    process.exit(1);
  }
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  console.log(`Login ✅  → ${page.url()}\n`);
  console.log('─'.repeat(62));

  const results = [];

  for (const ap of ADMIN_PAGES) {
    const pageJsErrors = [];
    const pageListener = (e) => pageJsErrors.push(e.message);
    page.on('pageerror', pageListener);

    await page.goto(`${BASE_URL}${ap.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    // Wait for loading spinners to clear
    await page.waitForFunction(
      () => !document.body.innerText.includes('Loading…'),
      { timeout: 8000 }
    ).catch(() => {});

    const finalUrl = page.url();
    const bounced = finalUrl.includes('/login') || finalUrl.includes('/unauthorized');
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    const hasContent = bodyText.length > 100 && !bounced;

    // Specific checks
    const issues = [];
    const notes = [];

    if (bounced) {
      issues.push(`bounced → ${finalUrl}`);
    }

    if (ap.checks.noNaN) {
      const nanMatches = bodyText.match(/\bNaN\b/g);
      if (nanMatches) issues.push(`NaN found (${nanMatches.length}×)`);
      else notes.push('NaN-free');
    }

    if (ap.checks.keywords) {
      const missing = ap.checks.keywords.filter((k) => !bodyText.toLowerCase().includes(k.toLowerCase()));
      if (missing.length) issues.push(`missing: ${missing.join(', ')}`);
      else notes.push(`keywords OK`);
    }

    // Tab interactions
    if (ap.checks.tabs && !bounced) {
      for (const tabLabel of ap.checks.tabs) {
        try {
          await page.locator('button', { hasText: tabLabel }).first().click();
          await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
          await page.waitForFunction(
            () => !document.body.innerText.includes('Loading…'),
            { timeout: 5000 }
          ).catch(() => {});
          const tabText = await page.evaluate(() => document.body.innerText.trim());
          const propCount = (tabText.match(/\bACTIVE\b|\bPENDING_APPROVAL\b|\bOCCUPIED\b|\bINACTIVE\b/g) || []).length;
          notes.push(`tab "${tabLabel}": ${propCount} property badges`);
          // Count property cards by looking for Edit/Delete action buttons in pairs
          const cardCount = await page.evaluate(() => {
            return document.querySelectorAll('div.rounded-xl.border.border-gray-100.shadow-sm.p-4').length;
          });
          if (cardCount > 0) notes.push(`${cardCount} cards visible`);
        } catch (e) {
          issues.push(`tab "${tabLabel}" click failed: ${e.message.split('\n')[0]}`);
        }
      }
    }

    // Page-specific content checks
    if (ap.path === '/admin/dashboard') {
      const numbers = bodyText.match(/\b\d[\d,]*\b/g)?.slice(0, 8) ?? [];
      notes.push(`KPI numbers: ${numbers.join(', ')}`);
    }
    if (ap.path === '/admin/users') {
      const userCount = (bodyText.match(/LANDLORD|TENANT|ADMIN/g) || []).length;
      notes.push(`${userCount} role badges`);
    }
    if (ap.path === '/admin/finance') {
      const rwfMatches = bodyText.match(/RWF [\d,]+/g) ?? [];
      notes.push(`RWF values: ${rwfMatches.join(', ') || 'none'}`);
    }
    if (ap.path === '/admin/audit-log') {
      const hasEntries = /PROPERTY|USER|KYC|LOGIN|CREATED|UPDATED|DELETED/i.test(bodyText);
      notes.push(hasEntries ? 'has audit entries' : 'no entries yet');
    }
    if (ap.path === '/admin/settings') {
      const hasForm = await page.evaluate(() => !!document.querySelector('input, select, textarea'));
      notes.push(hasForm ? 'has form inputs' : 'no form inputs');
    }

    // Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${slug(ap.label)}.png`),
      fullPage: true,
    });

    page.off('pageerror', pageListener);

    const statusIcon = bounced ? '❌' : issues.length ? '⚠️ ' : '✅';
    const statusLine = `${statusIcon} ${ap.label.padEnd(20)}`;
    const detailParts = [];
    if (notes.length) detailParts.push(notes.join(' · '));
    if (issues.length) detailParts.push(`ISSUES: ${issues.join('; ')}`);
    if (pageJsErrors.length) detailParts.push(`JS: ${pageJsErrors[0].split('\n')[0]}`);

    console.log(statusLine);
    if (detailParts.length) console.log(`   ${detailParts.join('\n   ')}`);

    results.push({
      label: ap.label,
      path: ap.path,
      pass: !bounced && issues.length === 0,
      bounced,
      issues,
      notes,
      jsErrors: pageJsErrors,
    });

    console.log('─'.repeat(62));
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log(`\n${'═'.repeat(62)}`);
  console.log(`SUMMARY  ${passed}/${results.length} pages OK`);
  console.log('═'.repeat(62));
  for (const r of results) {
    const icon = r.pass ? '✅' : r.bounced ? '❌' : '⚠️ ';
    console.log(`${icon} ${r.path}`);
    if (r.issues.length) console.log(`   → ${r.issues.join('; ')}`);
  }

  const globalJsErrs = allJsErrors.filter((e) => !e.msg.includes('hydration'));
  if (globalJsErrs.length) {
    console.log(`\n⚠️  Global JS errors (${globalJsErrs.length}):`);
    globalJsErrs.slice(0, 5).forEach((e) => console.log(`   [${e.url}] ${e.msg.split('\n')[0]}`));
  }

  console.log(`\nScreenshots: ${SCREENSHOT_DIR}`);
  console.log(`Overall: ${failed === 0 ? 'ALL PASS ✅' : `${failed} ISSUES ❌`}`);

  await browser.close();
})();
