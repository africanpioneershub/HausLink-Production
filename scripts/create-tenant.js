const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const EMAIL = process.env.DEMO_TENANT_EMAIL ?? 'tenant@hauselink.com';
  const PASSWORD = process.env.DEMO_PASSWORD;
  if (!PASSWORD) {
    console.error('Missing DEMO_PASSWORD env var. Copy scripts/.env.scripts.example to scripts/.env.scripts and fill in values.');
    process.exit(1);
  }
  const NAME = 'Amina Uwase';
  const PHONE = '+250788000003';

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
        role: 'TENANT',
        status: 'ACTIVE',
        kyc_status: 'APPROVED',
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
      role: 'TENANT',
      status: 'ACTIVE',
      kyc_status: 'APPROVED',
      district: 'Gasabo',
      city: 'Kigali',
    },
  });

  console.log('DB user created:', dbUser.id);
  console.log('');
  console.log('=== DEMO TENANT CREATED ===');
  console.log('Name:', NAME);
  console.log('Email:', EMAIL);
  console.log('Password:', PASSWORD);
  console.log('Role: TENANT');
  console.log('Status: ACTIVE');
  console.log('KYC: APPROVED');
  console.log('Can apply for properties: YES');

  await prisma.$disconnect();
})();
