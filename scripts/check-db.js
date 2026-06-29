const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const props = await prisma.property.findMany({
    select: {
      id: true, title: true, status: true,
      type: true, district: true, rent_rwf: true,
      landlord_id: true, created_at: true
    },
    orderBy: { created_at: 'asc' }
  });
  console.log('Total properties in DB:', props.length);
  props.forEach((p, i) => console.log(
    `${i+1}.`, p.title,
    '| status:', p.status,
    '| landlord:', p.landlord_id.slice(0,8)
  ));
  await prisma.$disconnect();
})();
