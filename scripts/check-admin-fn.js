const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const rows = await prisma.$queryRaw`SELECT * FROM get_admin_dashboard_kpis()`;
    console.log('Function exists. Result:', JSON.stringify(rows, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v, 2));
  } catch (e) {
    console.log('Function call failed:', e.message.split('\n')[0]);
  }
  await prisma.$disconnect();
})();
