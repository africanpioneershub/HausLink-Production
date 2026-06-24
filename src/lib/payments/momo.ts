interface InitiateMoMoPaymentParams {
  phoneNumber: string;
  amount: number;
  externalId: string;
  description: string;
}

interface MoMoPaymentResult {
  transactionId: string;
  status: 'PENDING' | 'FAILED';
  error?: string;
}

async function getMoMoAccessToken(): Promise<string> {
  const baseUrl = process.env.MOMO_BASE_URL;
  const apiUser = process.env.MOMO_API_USER;
  const apiKey = process.env.MOMO_API_KEY;
  const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;

  const credentials = Buffer.from(`${apiUser}:${apiKey}`).toString('base64');

  const res = await fetch(`${baseUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey ?? '',
    },
  });

  if (!res.ok) {
    throw new Error(`MoMo token request failed: ${res.status}`);
  }

  const json = await res.json();
  return json.access_token;
}

export async function initiateMoMoPayment({
  phoneNumber,
  amount,
  externalId,
  description,
}: InitiateMoMoPaymentParams): Promise<MoMoPaymentResult> {
  const baseUrl = process.env.MOMO_BASE_URL;
  const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
  const targetEnvironment = process.env.MOMO_ENV ?? 'sandbox';

  if (!baseUrl || !subscriptionKey || !process.env.MOMO_API_USER || !process.env.MOMO_API_KEY) {
    console.error('[MoMo] Missing required environment variables');
    return { transactionId: '', status: 'FAILED', error: 'MoMo client not configured' };
  }

  const referenceId = crypto.randomUUID();

  try {
    const token = await getMoMoAccessToken();

    const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': targetEnvironment,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(amount),
        currency: 'RWF',
        externalId,
        payer: { partyIdType: 'MSISDN', partyId: phoneNumber },
        payerMessage: description,
        payeeNote: description,
      }),
    });

    if (res.status !== 202) {
      const text = await res.text().catch(() => '');
      console.error('[MoMo] requesttopay failed', res.status, text);
      return { transactionId: referenceId, status: 'FAILED', error: 'Failed to initiate payment' };
    }

    return { transactionId: referenceId, status: 'PENDING' };
  } catch (error) {
    console.error('[MoMo] initiateMoMoPayment error', error);
    return { transactionId: referenceId, status: 'FAILED', error: 'Network error contacting MoMo' };
  }
}

interface DisburseToLandlordParams {
  phoneNumber: string;
  amount: number;
  externalId: string;
  description: string;
}

export async function disburseToLandlord({
  phoneNumber,
  amount,
  externalId,
  description,
}: DisburseToLandlordParams): Promise<MoMoPaymentResult> {
  const baseUrl = process.env.MOMO_BASE_URL;
  const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
  const targetEnvironment = process.env.MOMO_ENV ?? 'sandbox';

  if (!baseUrl || !subscriptionKey || !process.env.MOMO_API_USER || !process.env.MOMO_API_KEY) {
    console.error('[MoMo] Missing required environment variables');
    return { transactionId: '', status: 'FAILED', error: 'MoMo client not configured' };
  }

  const referenceId = crypto.randomUUID();

  try {
    const token = await getMoMoAccessToken();

    const res = await fetch(`${baseUrl}/disbursement/v1_0/transfer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': targetEnvironment,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(amount),
        currency: 'RWF',
        externalId,
        payee: { partyIdType: 'MSISDN', partyId: phoneNumber },
        payerMessage: description,
        payeeNote: description,
      }),
    });

    if (res.status !== 202) {
      const text = await res.text().catch(() => '');
      console.error('[MoMo] disbursement transfer failed', res.status, text);
      return { transactionId: referenceId, status: 'FAILED', error: 'Failed to initiate disbursement' };
    }

    return { transactionId: referenceId, status: 'PENDING' };
  } catch (error) {
    console.error('[MoMo] disburseToLandlord error', error);
    return { transactionId: referenceId, status: 'FAILED', error: 'Network error contacting MoMo' };
  }
}
