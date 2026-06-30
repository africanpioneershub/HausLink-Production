const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const [tenants, tenancies] = await Promise.all([
    prisma.user.count({ where: { role: 'TENANT', status: 'ACTIVE' } }),
    prisma.tenancy.count({ where: { status: 'ACTIVE' } }),
  ]);
  console.log('Active TENANT users:', tenants);
  console.log('Active tenancies:', tenancies);
  await prisma.$disconnect();
})();
