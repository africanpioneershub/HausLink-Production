const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const EMAIL = 'landlord2@hauselink.com';
  const PASSWORD = 'HausLink@Demo2026!';
  const NAME = 'Marie Claire Uwimana';
  const PHONE = '+250788000002';

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
      district: 'Nyarugenge',
      city: 'Kigali',
    },
  });

  console.log('Second landlord created:', dbUser.id);
  console.log('Email:', EMAIL);
  console.log('Password:', PASSWORD);
  await prisma.$disconnect();
})();
