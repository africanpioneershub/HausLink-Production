import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env.local
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^"|"$/g, '');
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const SQL = `
CREATE INDEX IF NOT EXISTS properties_status_idx ON properties(status);
CREATE INDEX IF NOT EXISTS properties_landlord_id_idx ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS properties_featured_status_idx ON properties(featured, status);
CREATE INDEX IF NOT EXISTS properties_status_created_at_idx ON properties(status, created_at);
CREATE INDEX IF NOT EXISTS applications_tenant_id_idx ON applications(tenant_id);
CREATE INDEX IF NOT EXISTS applications_landlord_id_idx ON applications(landlord_id);
CREATE INDEX IF NOT EXISTS applications_property_id_idx ON applications(property_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status);
CREATE INDEX IF NOT EXISTS payments_tenant_id_idx ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS payments_landlord_id_idx ON payments(landlord_id);
CREATE INDEX IF NOT EXISTS payments_tenancy_id_idx ON payments(tenancy_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at);
`;

// Use Supabase's /rpc/exec_sql or similar endpoint
// Try calling the Supabase REST API
const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sql: SQL }),
});

if (res.ok) {
  console.log('✅ Indexes created via RPC');
} else {
  const text = await res.text();
  console.log(`RPC failed (${res.status}): ${text}`);
  console.log('\nIndexes need to be applied manually via Supabase SQL editor:');
  console.log(SQL);
}
