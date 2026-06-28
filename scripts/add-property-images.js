const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const properties = await prisma.property.findMany({
    select: { id: true, title: true, type: true },
    orderBy: { created_at: 'asc' },
  });

  console.log('Properties found:', properties.length);

  const imageMap = {
    APARTMENT: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
    ],
    HOUSE: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
      'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
    ],
    STUDIO: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80',
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80',
    ],
    ROOM: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
      'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=800&q=80',
    ],
    OFFICE: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
      'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80',
    ],
    VILLA: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
      'https://images.unsplash.com/photo-1598228723793-32e4ade3b8d1?w=800&q=80',
    ],
  };

  for (const property of properties) {
    const existing = await prisma.propertyImage.count({
      where: { property_id: property.id },
    });
    if (existing > 0) {
      console.log('Skipping (already has images):', property.title);
      continue;
    }

    const images = imageMap[property.type] ?? imageMap.APARTMENT;
    for (let i = 0; i < images.length; i++) {
      await prisma.propertyImage.create({
        data: {
          property_id: property.id,
          storage_path: images[i],
          cdn_url: images[i],
          is_primary: i === 0,
          display_order: i,
        },
      });
    }
    console.log('Added', images.length, 'images to:', property.title);
  }

  const total = await prisma.propertyImage.count();
  console.log('\nTotal images in DB:', total);
  await prisma.$disconnect();
})();
