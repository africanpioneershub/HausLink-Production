import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS properties_status_idx ON properties(status)',
  'CREATE INDEX IF NOT EXISTS properties_landlord_id_idx ON properties(landlord_id)',
  'CREATE INDEX IF NOT EXISTS properties_featured_status_idx ON properties(featured, status)',
  'CREATE INDEX IF NOT EXISTS properties_status_created_at_idx ON properties(status, created_at)',
  'CREATE INDEX IF NOT EXISTS applications_tenant_id_idx ON applications(tenant_id)',
  'CREATE INDEX IF NOT EXISTS applications_landlord_id_idx ON applications(landlord_id)',
  'CREATE INDEX IF NOT EXISTS applications_property_id_idx ON applications(property_id)',
  'CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status)',
  'CREATE INDEX IF NOT EXISTS payments_tenant_id_idx ON payments(tenant_id)',
  'CREATE INDEX IF NOT EXISTS payments_landlord_id_idx ON payments(landlord_id)',
  'CREATE INDEX IF NOT EXISTS payments_tenancy_id_idx ON payments(tenancy_id)',
  'CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status)',
  'CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action)',
  'CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON audit_log(user_id)',
  'CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at)',
];

async function main() {
  for (const sql of INDEXES) {
    try {
      await prisma.$executeRawUnsafe(sql);
      const name = sql.match(/IF NOT EXISTS (\w+)/)?.[1] ?? sql;
      console.log(`✅ ${name}`);
    } catch (e) {
      const name = sql.match(/IF NOT EXISTS (\w+)/)?.[1] ?? sql;
      console.log(`❌ ${name}: ${(e as Error).message}`);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
