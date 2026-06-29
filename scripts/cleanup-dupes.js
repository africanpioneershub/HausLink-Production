const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const dupeIds = [
  'cmqxivsrx0001qo601sfn5wp5',
  'cmqxivu7p0003qo60qx3kxvof',
  'cmqxivvn90005qo605opfqzti',
  'cmqxivx2f0007qo60gxhogurv',
  'cmqxivy930009qo6027q0jlg4',
];

(async () => {
  const del = await prisma.property.deleteMany({ where: { id: { in: dupeIds } } });
  console.log('Deleted duplicate properties:', del.count);
  const remaining = await prisma.property.count();
  console.log('Remaining properties:', remaining);
  await prisma.$disconnect();
})();
