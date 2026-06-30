const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('=== DIMENSION 3 — INTEGRATIONS ===\n');

  const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY       = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const REDIS_URL      = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN    = process.env.UPSTASH_REDIS_REST_TOKEN;
  const RESEND_KEY     = process.env.RESEND_API_KEY;
  const MOMO_BASE      = process.env.MOMO_BASE_URL;
  const AIRTEL_BASE    = process.env.AIRTEL_BASE_URL;
  const WA_TOKEN       = process.env.WHATSAPP_TOKEN;
  const APP_URL        = process.env.NEXT_PUBLIC_APP_URL;
  const CRON_SECRET    = process.env.CRON_SECRET;
  const ADMIN_OTP      = process.env.ADMIN_OTP_SECRET;
  const AIRTEL_HOOK    = process.env.AIRTEL_WEBHOOK_SECRET;

  // 1. Supabase Auth API
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const json = await res.json();
    console.log(`Supabase Auth API:       ${res.ok ? `✅ reachable (${json.total ?? json.users?.length ?? '?'} users)` : '❌ ' + res.status}`);
  } catch (e) {
    console.log(`Supabase Auth API:       ❌ ${e.message}`);
  }

  // 2. Supabase Storage
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const json = await res.json();
    const buckets = Array.isArray(json) ? json.map((b) => b.name).join(', ') : '(none)';
    console.log(`Supabase Storage:        ${res.ok ? `✅ buckets: [${buckets}]` : '❌ ' + res.status}`);
  } catch (e) {
    console.log(`Supabase Storage:        ❌ ${e.message}`);
  }

  // 3. Database via Prisma
  try {
    const count = await prisma.user.count();
    console.log(`Supabase DB (Prisma):    ✅ connected (${count} users)`);
  } catch (e) {
    console.log(`Supabase DB (Prisma):    ❌ ${e.message.split('\n')[0]}`);
  }

  // 4. Upstash Redis — ping
  try {
    const res = await fetch(`${REDIS_URL}/ping`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const json = await res.json();
    console.log(`Upstash Redis:           ${json.result === 'PONG' ? '✅ PONG' : '❌ ' + JSON.stringify(json)}`);
  } catch (e) {
    console.log(`Upstash Redis:           ❌ ${e.message}`);
  }

  // 5. Upstash Redis — cache round-trip
  try {
    const key = `audit:${Date.now()}`;
    await fetch(`${REDIS_URL}/set/${key}/test_value`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const getRes = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const getJson = await getRes.json();
    const ok = getJson.result === 'test_value';
    // cleanup
    await fetch(`${REDIS_URL}/del/${key}`, { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } });
    console.log(`Upstash Redis R/W:       ${ok ? '✅ set/get/del works' : '❌ read-back mismatch'}`);
  } catch (e) {
    console.log(`Upstash Redis R/W:       ❌ ${e.message}`);
  }

  // 6. Resend email
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${RESEND_KEY}` },
    });
    const json = await res.json();
    const domains = json.data?.map((d) => d.name).join(', ') ?? '(no domains)';
    console.log(`Resend Email:            ${res.ok ? `✅ authenticated (${domains})` : '❌ ' + res.status}`);
  } catch (e) {
    console.log(`Resend Email:            ❌ ${e.message}`);
  }

  // 7. MTN MoMo
  console.log(`MTN MoMo:                ${MOMO_BASE ? `⚠️  env set (${MOMO_BASE}) — no live credentials` : '❌ MOMO_BASE_URL not set'}`);

  // 8. Airtel Money
  const hasAirtelHook = !!AIRTEL_HOOK;
  console.log(`Airtel Money:            ${AIRTEL_BASE ? `⚠️  env set — sandbox only` : hasAirtelHook ? '⚠️  webhook secret set, no AIRTEL_BASE_URL' : '❌ Not configured'}`);

  // 9. WhatsApp
  console.log(`WhatsApp:                ${WA_TOKEN ? '✅ token set' : '⚠️  not configured (optional)'}`);

  // 10. App URL
  console.log(`NEXT_PUBLIC_APP_URL:     ${APP_URL ? (APP_URL.includes('hauselink') ? `✅ ${APP_URL}` : `⚠️ ${APP_URL}`) : '❌ not set'}`);

  // 11. CRON_SECRET
  console.log(`CRON_SECRET:             ${CRON_SECRET ? '✅ set' : '❌ missing'}`);

  // 12. ADMIN_OTP_SECRET (2FA)
  console.log(`ADMIN_OTP_SECRET:        ${ADMIN_OTP ? '✅ set' : '❌ missing — admin 2FA won\'t work'}`);

  // 13. Key lengths (sanity)
  console.log('\n--- Key Sanity ---');
  console.log(`  SERVICE_KEY length:  ${SERVICE_KEY?.length ?? 0} ${SERVICE_KEY?.length > 100 ? '✅' : '❌'}`);
  console.log(`  ANON_KEY length:     ${ANON_KEY?.length ?? 0} ${ANON_KEY?.length > 100 ? '✅' : '❌'}`);
  console.log(`  REDIS_TOKEN length:  ${REDIS_TOKEN?.length ?? 0} ${REDIS_TOKEN?.length > 10 ? '✅' : '❌'}`);
  console.log(`  RESEND_KEY length:   ${RESEND_KEY?.length ?? 0} ${RESEND_KEY?.length > 10 ? '✅' : '❌'}`);

  await prisma.$disconnect();
  console.log('\nIntegration check complete.');
})();
