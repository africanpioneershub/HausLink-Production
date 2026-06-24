import { randomUUID } from 'crypto';

async function main() {
  const baseUrl = process.env.MOMO_BASE_URL ?? 'https://sandbox.momodeveloper.mtn.com';
  const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;

  if (!subscriptionKey) {
    console.error('MOMO_SUBSCRIPTION_KEY must be set in your environment before running this script.');
    process.exit(1);
  }

  const apiUserId = randomUUID();

  console.log(`Creating MoMo sandbox API user (${apiUserId})...`);

  const createUserRes = await fetch(`${baseUrl}/collection/v1_0/apiuser`, {
    method: 'PUT',
    headers: {
      'X-Reference-Id': apiUserId,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ providerCallbackHost: 'hauslink.rw' }),
  });

  if (!createUserRes.ok && createUserRes.status !== 201) {
    const text = await createUserRes.text().catch(() => '');
    console.error(`Failed to create API user: ${createUserRes.status} ${text}`);
    process.exit(1);
  }

  console.log('API user created. Generating API key...');

  const createKeyRes = await fetch(`${baseUrl}/collection/v1_0/apiuser/${apiUserId}/apikey`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
  });

  if (!createKeyRes.ok) {
    const text = await createKeyRes.text().catch(() => '');
    console.error(`Failed to create API key: ${createKeyRes.status} ${text}`);
    process.exit(1);
  }

  const { apiKey } = await createKeyRes.json();

  console.log('\nMoMo sandbox setup complete. Add these to your .env file:\n');
  console.log(`MOMO_API_USER=${apiUserId}`);
  console.log(`MOMO_API_KEY=${apiKey}`);
}

main().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
