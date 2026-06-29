const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany({
    select: {
      name: true, email: true, role: true,
      status: true, kyc_status: true
    },
    orderBy: { created_at: 'asc' }
  });
  console.log('All accounts in DB:');
  console.log('Total:', users.length);
  users.forEach(u => console.log(
    '-', u.name ?? u.email,
    '|', u.role,
    '| status:', u.status,
    '| kyc:', u.kyc_status
  ));
  await prisma.$disconnect();
})();
