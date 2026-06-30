const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

(async () => {
  console.log('=== DIMENSION 1 — DATA INTEGRITY ===\n');

  try {
    // Users
    const totalUsers       = await prisma.user.count();
    const admins           = await prisma.user.count({ where: { role: 'ADMIN' } });
    const landlords        = await prisma.user.count({ where: { role: 'LANDLORD' } });
    const tenants          = await prisma.user.count({ where: { role: 'TENANT' } });
    const activeUsers      = await prisma.user.count({ where: { status: 'ACTIVE' } });
    const bannedUsers      = await prisma.user.count({ where: { status: 'BANNED' } });

    console.log('--- Users ---');
    console.log(`  Total: ${totalUsers} (${admins} admin, ${landlords} landlord, ${tenants} tenant)`);
    console.log(`  Active: ${activeUsers}  Banned: ${bannedUsers}`);
    const roleSum = admins + landlords + tenants;
    console.log(`  ${roleSum === totalUsers ? '✅' : '❌'} Role sum: ${roleSum} == ${totalUsers}`);

    // Properties
    const totalProperties  = await prisma.property.count();
    const activeProperties = await prisma.property.count({ where: { status: 'ACTIVE' } });
    const pendingProps     = await prisma.property.count({ where: { status: 'PENDING_APPROVAL' } });

    console.log('\n--- Properties ---');
    console.log(`  Total: ${totalProperties}`);
    console.log(`  ${activeProperties === 6 ? '✅' : '❌'} Active: ${activeProperties} (expected 6)`);
    console.log(`  Pending approval: ${pendingProps}`);

    // Images
    const totalImages = await prisma.propertyImage.count();
    const avg = totalProperties > 0 ? (totalImages / totalProperties).toFixed(1) : 0;
    console.log('\n--- Images ---');
    console.log(`  Total: ${totalImages} (avg ${avg}/property)  ${totalImages > 0 ? '✅' : '❌'}`);

    const propsWithImages = await prisma.property.findMany({
      select: { title: true, _count: { select: { images: true } } },
      orderBy: { created_at: 'asc' },
    });
    propsWithImages.forEach((p) =>
      console.log(`  ${p._count.images > 0 ? '✅' : '❌'} ${p.title.slice(0, 40).padEnd(40)} → ${p._count.images} img(s)`)
    );

    // Platform config
    const configRows = await prisma.platformConfig.count();
    const config     = await prisma.platformConfig.findFirst();
    console.log('\n--- Platform Config ---');
    console.log(`  ${configRows === 1 ? '✅' : '❌'} Config rows: ${configRows} (should be 1)`);
    if (config) {
      console.log(`  transaction_fee_pct:      ${config.transaction_fee_pct}%`);
      console.log(`  landlord_registration_rwf: ${config.landlord_registration_rwf}`);
      console.log(`  support_email:             ${config.support_email ?? '❌ missing'}`);
    }

    // Activity
    const auditRows    = await prisma.auditLog.count();
    const kycDocs      = await prisma.kYCDocument.count();
    const savedProps   = await prisma.savedProperty.count();
    const payments     = await prisma.payment.count();
    const tenancies    = await prisma.tenancy.count();
    const applications = await prisma.application.count();
    const ledger       = await prisma.ledgerEntry.count();

    console.log('\n--- Platform Activity ---');
    console.log(`  Audit log entries: ${auditRows} ${auditRows > 0 ? '✅' : '⚠️'}`);
    console.log(`  KYC documents:     ${kycDocs}`);
    console.log(`  Saved properties:  ${savedProps}`);
    console.log(`  Payments:          ${payments}`);
    console.log(`  Tenancies:         ${tenancies}`);
    console.log(`  Applications:      ${applications}`);
    console.log(`  Ledger entries:    ${ledger}`);

    // Field integrity
    const usersNoEmail = await prisma.user.count({ where: { email: '' } });
    const usersNoRole  = await prisma.user.count({ where: { role: '' } });
    console.log('\n--- Field Integrity ---');
    console.log(`  ${usersNoEmail === 0 ? '✅' : '❌'} Users with blank email: ${usersNoEmail}`);
    console.log(`  ${usersNoRole === 0 ? '✅' : '❌'} Users with blank role:  ${usersNoRole}`);

    // Recent audit log
    const recentAudit = await prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      select: { action: true, entity_type: true, created_at: true },
    });
    console.log('\n--- Recent Audit Log (last 5) ---');
    recentAudit.forEach((e) =>
      console.log(`  ${e.action.padEnd(20)} ${e.entity_type.padEnd(12)} ${e.created_at.toISOString().slice(0, 16)}`)
    );

    console.log('\nData integrity check complete ✅');
  } catch (err) {
    console.error('Error:', err.message?.split('\n')[0]);
  } finally {
    await prisma.$disconnect();
  }
})();
