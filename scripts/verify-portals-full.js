const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BROWSERS_PATH = path.join(process.env.USERPROFILE, '.playwright-browsers');
const BASE_URL = 'https://www.hauselink.com';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tmp-screenshots', 'portals');
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

// ── Portal definitions ─────────────────────────────────────────────────────

const LANDLORD_PAGES = [
  {
    label: 'Dashboard',
    path: '/landlord/dashboard',
    checks: { noNaN: true, keywords: ['dashboard', 'landlord', 'properties', 'tenancies', 'revenue'] },
  },
  {
    label: 'My Properties',
    path: '/landlord/properties',
    checks: {
      noNaN: true,
      keywords: ['properties'],
      propData: ['Kiyovu', 'Kimihurura', 'Remera', 'Nyarutarama', 'Villa', 'Studio'],
    },
  },
  {
    label: 'Applications',
    path: '/landlord/applications',
    checks: { noNaN: true },
  },
  {
    label: 'Tenancies',
    path: '/landlord/tenancies',
    checks: { noNaN: true },
  },
  {
    label: 'Maintenance',
    path: '/landlord/maintenance',
    checks: { noNaN: true },
  },
  {
    label: 'Rent Collection',
    path: '/landlord/payments',
    checks: { noNaN: true },
  },
  {
    label: 'Finance & Reports',
    path: '/landlord/finance',
    checks: { noNaN: true },
  },
  {
    label: 'Messages',
    path: '/landlord/messages',
    checks: { noNaN: true },
  },
  {
    label: 'Settings',
    path: '/landlord/settings',
    checks: { noNaN: true, hasForm: true },
  },
];

const TENANT_PAGES = [
  {
    label: 'Dashboard',
    path: '/tenant/dashboard',
    checks: { noNaN: true, keywords: ['dashboard', 'tenant'] },
  },
  {
    label: 'Find Properties',
    path: '/tenant/properties',
    checks: {
      noNaN: true,
      propData: ['Kiyovu', 'Kimihurura', 'Remera', 'Nyarutarama', 'RWF'],
    },
  },
  {
    label: 'My Applications',
    path: '/tenant/applications',
    checks: { noNaN: true },
  },
  {
    label: 'My Tenancy',
    path: '/tenant/tenancy',
    checks: { noNaN: true },
  },
  {
    label: 'Payments',
    path: '/tenant/payments',
    checks: { noNaN: true },
  },
  {
    label: 'Maintenance',
    path: '/tenant/maintenance',
    checks: { noNaN: true },
  },
  {
    label: 'Messages',
    path: '/tenant/messages',
    checks: { noNaN: true },
  },
  {
    label: 'Saved Properties',
    path: '/tenant/saved',
    checks: { noNaN: true },
  },
  {
    label: 'Settings',
    path: '/tenant/settings',
    checks: { noNaN: true, hasForm: true },
  },
];

// ── Shared page-checker ────────────────────────────────────────────────────

async function walkPages(page, portalLabel, pages, prefix) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  ${portalLabel}`);
  console.log('═'.repeat(64));

  const results = [];

  for (const ap of pages) {
    const pageJsErrors = [];
    const pageListener = (e) => pageJsErrors.push(e.message);
    page.on('pageerror', pageListener);

    await page.goto(`${BASE_URL}${ap.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.waitForFunction(
      () => !document.body.innerText.includes('Loading…'),
      { timeout: 8000 }
    ).catch(() => {});

    const finalUrl = page.url();
    const bounced = finalUrl.includes('/login') || finalUrl.includes('/unauthorized') || finalUrl.includes('/onboarding');
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    const hasContent = bodyText.length > 80;

    const issues = [];
    const notes = [];

    if (bounced) {
      issues.push(`bounced → ${finalUrl.replace(BASE_URL, '')}`);
    }

    if (!bounced) {
      if (ap.checks.noNaN && /\bNaN\b/.test(bodyText)) {
        issues.push('NaN found');
      } else if (ap.checks.noNaN) {
        notes.push('NaN-free');
      }

      if (ap.checks.keywords) {
        const missing = ap.checks.keywords.filter(
          (k) => !bodyText.toLowerCase().includes(k.toLowerCase())
        );
        if (missing.length) issues.push(`missing keywords: ${missing.join(', ')}`);
      }

      if (ap.checks.propData) {
        const found = ap.checks.propData.filter((k) => bodyText.includes(k));
        if (found.length) notes.push(`data: ${found.join(', ')}`);
        else notes.push('no matching data keywords');
      }

      if (ap.checks.hasForm) {
        const hasForm = await page.evaluate(() => !!document.querySelector('input, select, textarea'));
        notes.push(hasForm ? 'form inputs ✓' : 'no form inputs');
      }

      // Detect "empty state" messages
      const emptyPhrases = [
        'no properties', 'no applications', 'no tenancies', 'no payments',
        'no messages', 'no maintenance', 'nothing here', 'no results',
        'no data', 'no saved', 'no requests',
      ];
      const emptyMsg = emptyPhrases.find((p) => bodyText.toLowerCase().includes(p));
      if (emptyMsg) notes.push(`empty: "${emptyMsg}"`);

      if (!hasContent) issues.push('thin content (<80 chars)');
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${prefix}-${ap.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`),
      fullPage: true,
    });

    page.off('pageerror', pageListener);

    const icon = bounced ? '❌' : issues.length ? '⚠️ ' : '✅';
    const detailParts = [...notes];
    if (issues.length) detailParts.push(`ISSUES: ${issues.join('; ')}`);
    if (pageJsErrors.length) detailParts.push(`JS err: ${pageJsErrors[0].split('\n')[0].slice(0, 80)}`);

    console.log(`${icon} ${ap.label.padEnd(22)} ${detailParts.join(' · ')}`);

    results.push({
      label: ap.label,
      path: ap.path,
      pass: !bounced && issues.length === 0,
      issues,
      notes,
    });
  }

  return results;
}

// ── Main ───────────────────────────────────────────────────────────────────

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: path.join(BROWSERS_PATH, 'chromium-1228', 'chrome-win64', 'chrome.exe'),
  });

  const allResults = {};

  // ── LANDLORD ──────────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();

    console.log('\n=== Logging in: Landlord ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await fillEmail(page, 'landlord@hauselink.com');
    await page.locator('input[type="password"]').fill('HausLink@Demo2026!');
    await page.locator('button[type="submit"]').click();
    try {
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
      console.log(`Login ✅ → ${page.url()}`);
    } catch {
      console.log('❌ Landlord login failed');
      await ctx.close();
      await browser.close();
      process.exit(1);
    }

    allResults.landlord = await walkPages(page, 'LANDLORD PORTAL (landlord@hauselink.com)', LANDLORD_PAGES, 'landlord');
    await ctx.close();
  }

  // ── TENANT ────────────────────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();

    console.log('\n=== Logging in: Tenant ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await fillEmail(page, 'tenant@hauselink.com');
    await page.locator('input[type="password"]').fill('HausLink@Demo2026!');
    await page.locator('button[type="submit"]').click();
    try {
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
      console.log(`Login ✅ → ${page.url()}`);
    } catch {
      console.log('❌ Tenant login failed');
      await ctx.close();
      await browser.close();
      process.exit(1);
    }

    allResults.tenant = await walkPages(page, 'TENANT PORTAL (tenant@hauselink.com)', TENANT_PAGES, 'tenant');
    await ctx.close();
  }

  await browser.close();

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`);
  console.log('  FINAL SUMMARY');
  console.log('═'.repeat(64));

  for (const [portal, results] of Object.entries(allResults)) {
    const passed = results.filter((r) => r.pass).length;
    console.log(`\n${portal.toUpperCase()}  ${passed}/${results.length} OK`);
    for (const r of results) {
      const icon = r.pass ? '✅' : '❌';
      console.log(`  ${icon} ${r.path}${r.issues.length ? '  → ' + r.issues.join('; ') : ''}`);
    }
  }

  const allPass = Object.values(allResults).flat().every((r) => r.pass);
  console.log(`\nOverall: ${allPass ? 'ALL PASS ✅' : 'SOME ISSUES ❌'}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);
})();
