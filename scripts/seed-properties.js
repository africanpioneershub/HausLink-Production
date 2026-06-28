const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_ID = 'a5a6e2e8-9f5e-40bf-98c0-bbe14b9ec1b7';

const properties = [
  {
    landlord_id: ADMIN_ID,
    title: 'Modern 2-Bedroom Apartment in Kiyovu',
    description:
      'Spacious and well-finished 2-bedroom apartment in the heart of Kigali. Features modern kitchen, secure parking, 24/7 security, and stunning city views. Walking distance to shops and restaurants.',
    type: 'APARTMENT',
    status: 'ACTIVE',
    district: 'Nyarugenge',
    city: 'Kiyovu',
    rent_rwf: 450000,
    deposit_rwf: 900000,
    bedrooms: 2,
    bathrooms: 1,
    is_verified: true,
    featured: true,
  },
  {
    landlord_id: ADMIN_ID,
    title: 'Executive 3-Bedroom House in Kimihurura',
    description:
      'Beautiful executive house with large garden, modern finishes, and ample parking. Located in the prestigious Kimihurura neighborhood, close to embassies and international schools.',
    type: 'HOUSE',
    status: 'ACTIVE',
    district: 'Gasabo',
    city: 'Kimihurura',
    rent_rwf: 1200000,
    deposit_rwf: 2400000,
    bedrooms: 3,
    bathrooms: 2,
    is_verified: true,
    featured: true,
  },
  {
    landlord_id: ADMIN_ID,
    title: 'Cozy Studio in Remera',
    description:
      'Affordable and comfortable studio apartment ideal for young professionals. Includes kitchenette, bathroom, and reliable internet connection. Close to Remera market and transport links.',
    type: 'STUDIO',
    status: 'ACTIVE',
    district: 'Gasabo',
    city: 'Remera',
    rent_rwf: 180000,
    deposit_rwf: 360000,
    bedrooms: 1,
    bathrooms: 1,
    is_verified: true,
    featured: false,
  },
  {
    landlord_id: ADMIN_ID,
    title: 'Furnished Room in Nyarutarama',
    description:
      'Fully furnished private room in a shared house in the quiet Nyarutarama neighborhood. Includes shared kitchen and living room. Perfect for single professionals or students.',
    type: 'ROOM',
    status: 'ACTIVE',
    district: 'Gasabo',
    city: 'Nyarutarama',
    rent_rwf: 120000,
    deposit_rwf: 240000,
    bedrooms: 1,
    bathrooms: 1,
    is_verified: false,
    featured: false,
  },
  {
    landlord_id: ADMIN_ID,
    title: 'Modern Office Space in CBD',
    description:
      'Professional office space in Kigali Central Business District. Suitable for small teams of 5-10 people. Includes reception area, meeting room, high-speed internet and 24/7 access.',
    type: 'OFFICE',
    status: 'ACTIVE',
    district: 'Nyarugenge',
    city: 'CBD',
    rent_rwf: 800000,
    deposit_rwf: 1600000,
    bedrooms: 0,
    bathrooms: 1,
    is_verified: true,
    featured: false,
  },
  {
    landlord_id: ADMIN_ID,
    title: 'Luxury Villa in Nyarutarama',
    description:
      'Stunning 4-bedroom villa with private swimming pool, large garden, and panoramic views of Kigali. High-end finishes throughout. Gated community with 24/7 security. Ideal for expats and executives.',
    type: 'VILLA',
    status: 'ACTIVE',
    district: 'Gasabo',
    city: 'Nyarutarama',
    rent_rwf: 2500000,
    deposit_rwf: 5000000,
    bedrooms: 4,
    bathrooms: 3,
    is_verified: true,
    featured: true,
  },
];

(async () => {
  for (const property of properties) {
    const created = await prisma.property.create({ data: property });
    console.log('Created:', created.title, '| ID:', created.id);
  }

  const count = await prisma.property.count();
  console.log('\nTotal properties in DB:', count);
  await prisma.$disconnect();
})();
