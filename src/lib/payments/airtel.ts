interface InitiateAirtelPaymentParams {
  phoneNumber: string;
  amount: number;
  reference: string;
  description: string;
}

interface AirtelPaymentResult {
  transactionId: string;
  status: 'PENDING' | 'FAILED';
  error?: string;
}

async function getAirtelAccessToken(): Promise<string> {
  const baseUrl = process.env.AIRTEL_BASE_URL;
  const clientId = process.env.AIRTEL_CLIENT_ID;
  const clientSecret = process.env.AIRTEL_CLIENT_SECRET;

  const res = await fetch(`${baseUrl}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    throw new Error(`Airtel token request failed: ${res.status}`);
  }

  const json = await res.json();
  return json.access_token;
}

export async function initiateAirtelPayment({
  phoneNumber,
  amount,
  reference,
  description,
}: InitiateAirtelPaymentParams): Promise<AirtelPaymentResult> {
  const baseUrl = process.env.AIRTEL_BASE_URL;

  if (!baseUrl || !process.env.AIRTEL_CLIENT_ID || !process.env.AIRTEL_CLIENT_SECRET) {
    console.error('[Airtel] Missing required environment variables');
    return { transactionId: '', status: 'FAILED', error: 'Airtel client not configured' };
  }

  try {
    const token = await getAirtelAccessToken();

    const res = await fetch(`${baseUrl}/merchant/v1/payments/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Country': 'RW',
        'X-Currency': 'RWF',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: description,
        subscriber: { country: 'RW', currency: 'RWF', msisdn: phoneNumber },
        transaction: { amount, country: 'RW', currency: 'RWF', id: reference },
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('[Airtel] payment request failed', res.status, json);
      return { transactionId: reference, status: 'FAILED', error: 'Failed to initiate payment' };
    }

    return { transactionId: json?.data?.transaction?.id ?? reference, status: 'PENDING' };
  } catch (error) {
    console.error('[Airtel] initiateAirtelPayment error', error);
    return { transactionId: reference, status: 'FAILED', error: 'Network error contacting Airtel' };
  }
}
