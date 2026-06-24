function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessToken(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.access_token;
}

async function main() {
  const baseUrl = process.env.AIRTEL_BASE_URL ?? 'https://openapiuat.airtel.africa';
  const country = process.env.AIRTEL_COUNTRY ?? 'RW';
  const currency = process.env.AIRTEL_CURRENCY ?? 'RWF';

  if (!process.env.AIRTEL_CLIENT_ID || !process.env.AIRTEL_CLIENT_SECRET) {
    console.error('AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET must be set in your environment.');
    process.exit(1);
  }

  console.log('Requesting Airtel access token...');
  const token = await getAccessToken(baseUrl);
  console.log('Access token received successfully.\n');

  const phone = process.env.TEST_PHONE ?? '0788000000';
  const amount = 100;
  const reference = `test-${Date.now()}`;

  console.log(`Initiating test collection request: phone=${phone} amount=${amount} reference=${reference}`);

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Country': country,
    'X-Currency': currency,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const paymentRes = await fetch(`${baseUrl}/merchant/v2/payments/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reference: 'HausLink sandbox test',
      subscriber: { country, currency, msisdn: phone },
      transaction: { amount, country, currency, id: reference },
    }),
  });

  const paymentJson = await paymentRes.json().catch(() => null);
  console.log('\nFull response:');
  console.log(JSON.stringify({ httpStatus: paymentRes.status, body: paymentJson }, null, 2));

  if (!paymentRes.ok || paymentJson?.status?.code !== '200') {
    console.error('\nTest collection request did not succeed. Stopping.');
    process.exit(1);
  }

  console.log('\nWaiting 5 seconds before checking payment status...');
  await sleep(5000);

  const statusRes = await fetch(`${baseUrl}/standard/v1/payments/${reference}`, {
    method: 'GET',
    headers,
  });

  const statusJson = await statusRes.json().catch(() => null);
  const rawStatus = statusJson?.data?.transaction?.status;
  const finalStatus = rawStatus === 'TS' ? 'SUCCESSFUL' : rawStatus === 'TF' ? 'FAILED' : 'PENDING';

  console.log('\nFinal status response:');
  console.log(JSON.stringify({ httpStatus: statusRes.status, body: statusJson }, null, 2));
  console.log(`\nFinal status: ${finalStatus}`);
}

main().catch((error) => {
  console.error('Test script failed:', error);
  process.exit(1);
});
