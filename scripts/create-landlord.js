const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const EMAIL = process.env.DEMO_LANDLORD_EMAIL ?? 'landlord@hauselink.com';
  const PASSWORD = process.env.DEMO_PASSWORD;
  if (!PASSWORD) {
    console.error('Missing DEMO_PASSWORD env var. Copy scripts/.env.scripts.example to scripts/.env.scripts and fill in values.');
    process.exit(1);
  }
  const NAME = 'Jean Pierre Hakizimana';
  const PHONE = '+250788000001';

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Create auth user via REST API (no SDK WebSocket issue)
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: NAME,
        role: 'LANDLORD',
        status: 'ACTIVE',
        kyc_status: 'APPROVED',
        registration_paid: true,
      },
    }),
  });

  const authData = await authRes.json();
  if (!authRes.ok) {
    console.error('Auth error:', authData.message ?? JSON.stringify(authData));
    process.exit(1);
  }

  const userId = authData.id;
  console.log('Auth user created:', userId);

  const dbUser = await prisma.user.create({
    data: {
      id: userId,
      email: EMAIL,
      name: NAME,
      phone: PHONE,
      role: 'LANDLORD',
      status: 'ACTIVE',
      kyc_status: 'APPROVED',
      registration_paid: true,
      district: 'Gasabo',
      city: 'Kigali',
    },
  });

  console.log('DB user created:', dbUser.id);

  const updated = await prisma.property.updateMany({
    data: { landlord_id: dbUser.id },
  });

  console.log('Properties reassigned:', updated.count);

  const props = await prisma.property.findMany({
    where: { landlord_id: dbUser.id },
    select: { title: true, status: true },
  });
  props.forEach(p => console.log(' -', p.title));

  await prisma.$disconnect();
  console.log('');
  console.log('Email:', EMAIL);
  console.log('Password:', PASSWORD);
})();
