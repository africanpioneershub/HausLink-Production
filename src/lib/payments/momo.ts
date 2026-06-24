type MoMoProduct = 'collection' | 'disbursement';
type MoMoPaymentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

interface InitiateMoMoPaymentParams {
  phoneNumber: string;
  amount: number;
  externalId: string;
  description: string;
}

interface DisburseToLandlordParams {
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

const TOKEN_CACHE_DURATION_MS = 50 * 60 * 1000; // 50 minutes

const tokenCache: Record<MoMoProduct, { token: string; expiresAt: number } | null> = {
  collection: null,
  disbursement: null,
};

function subscriptionKeyFor(product: MoMoProduct): string | undefined {
  return product === 'collection'
    ? process.env.MOMO_SUBSCRIPTION_KEY
    : process.env.MOMO_DISBURSEMENT_SUBSCRIPTION_KEY;
}

/**
 * Rwanda MSISDNs are sometimes entered as 07XXXXXXXX or +250XXXXXXXXX.
 * The MoMo API expects the bare digits in 250XXXXXXXXX form.
 */
function cleanPhoneNumber(phoneNumber: string): string {
  let digits = phoneNumber.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) {
    digits = `250${digits.slice(1)}`;
  }
  if (!digits.startsWith('250')) {
    digits = `250${digits}`;
  }
  return digits;
}

async function getMoMoAccessToken(product: MoMoProduct = 'collection'): Promise<string> {
  const cached = tokenCache[product];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const baseUrl = process.env.MOMO_BASE_URL;
  const apiUser = process.env.MOMO_API_USER;
  const apiKey = process.env.MOMO_API_KEY;
  const subscriptionKey = subscriptionKeyFor(product);

  const credentials = Buffer.from(`${apiUser}:${apiKey}`).toString('base64');

  const res = await fetch(`${baseUrl}/${product}/token/`, {
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
  tokenCache[product] = {
    token: json.access_token,
    expiresAt: Date.now() + TOKEN_CACHE_DURATION_MS,
  };

  return json.access_token;
}

function isMoMoConfigured(product: MoMoProduct): boolean {
  const baseUrl = process.env.MOMO_BASE_URL;
  const apiUser = process.env.MOMO_API_USER;
  const apiKey = process.env.MOMO_API_KEY;
  const subscriptionKey = subscriptionKeyFor(product);
  return !!(baseUrl && apiUser && apiKey && subscriptionKey);
}

export async function initiateMoMoPayment({
  phoneNumber,
  amount,
  externalId,
  description,
}: InitiateMoMoPaymentParams): Promise<MoMoPaymentResult> {
  if (!isMoMoConfigured('collection')) {
    console.error('[MoMo] Missing required environment variables');
    return { transactionId: externalId, status: 'FAILED', error: 'MoMo client not configured' };
  }

  const baseUrl = process.env.MOMO_BASE_URL;
  const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY!;
  const targetEnvironment = process.env.MOMO_TARGET_ENVIRONMENT ?? 'sandbox';
  const callbackUrl = process.env.MOMO_CALLBACK_URL;

  try {
    const token = await getMoMoAccessToken('collection');

    const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': externalId,
        'X-Target-Environment': targetEnvironment,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
        ...(callbackUrl ? { 'X-Callback-Url': callbackUrl } : {}),
      },
      body: JSON.stringify({
        amount: String(amount),
        currency: 'RWF',
        externalId,
        payer: { partyIdType: 'MSISDN', partyId: cleanPhoneNumber(phoneNumber) },
        payerMessage: description,
        payeeNote: description,
      }),
    });

    if (res.status !== 202) {
      const text = await res.text().catch(() => '');
      console.error('[MoMo] requesttopay failed', res.status, text);
      return { transactionId: externalId, status: 'FAILED', error: 'Failed to initiate payment' };
    }

    return { transactionId: externalId, status: 'PENDING' };
  } catch (error) {
    console.error('[MoMo] initiateMoMoPayment error', error);
    return { transactionId: externalId, status: 'FAILED', error: 'Network error contacting MoMo' };
  }
}

export async function getMoMoPaymentStatus(referenceId: string): Promise<MoMoPaymentStatus> {
  const baseUrl = process.env.MOMO_BASE_URL;
  const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
  const targetEnvironment = process.env.MOMO_TARGET_ENVIRONMENT ?? 'sandbox';

  if (!isMoMoConfigured('collection')) {
    console.error('[MoMo] Missing required environment variables');
    return 'FAILED';
  }

  try {
    const token = await getMoMoAccessToken('collection');

    const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': targetEnvironment,
        'Ocp-Apim-Subscription-Key': subscriptionKey ?? '',
      },
    });

    if (!res.ok) {
      console.error('[MoMo] getMoMoPaymentStatus failed', res.status);
      return 'PENDING';
    }

    const json = await res.json();
    const status = json?.status as string;

    if (status === 'SUCCESSFUL') return 'SUCCESSFUL';
    if (status === 'FAILED') return 'FAILED';
    return 'PENDING';
  } catch (error) {
    console.error('[MoMo] getMoMoPaymentStatus error', error);
    return 'PENDING';
  }
}

export async function disburseToLandlord({
  phoneNumber,
  amount,
  externalId,
  description,
}: DisburseToLandlordParams): Promise<MoMoPaymentResult> {
  if (!isMoMoConfigured('disbursement')) {
    console.error('[MoMo] Missing required disbursement environment variables');
    return { transactionId: externalId, status: 'FAILED', error: 'MoMo disbursement not configured' };
  }

  const baseUrl = process.env.MOMO_BASE_URL;
  const subscriptionKey = process.env.MOMO_DISBURSEMENT_SUBSCRIPTION_KEY!;
  const targetEnvironment = process.env.MOMO_TARGET_ENVIRONMENT ?? 'sandbox';

  try {
    const token = await getMoMoAccessToken('disbursement');

    const res = await fetch(`${baseUrl}/disbursement/v1_0/transfer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': externalId,
        'X-Target-Environment': targetEnvironment,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(amount),
        currency: 'RWF',
        externalId,
        payee: { partyIdType: 'MSISDN', partyId: cleanPhoneNumber(phoneNumber) },
        payerMessage: description,
        payeeNote: description,
      }),
    });

    if (res.status !== 202) {
      const text = await res.text().catch(() => '');
      console.error('[MoMo] disbursement transfer failed', res.status, text);
      return { transactionId: externalId, status: 'FAILED', error: 'Failed to initiate disbursement' };
    }

    return { transactionId: externalId, status: 'PENDING' };
  } catch (error) {
    console.error('[MoMo] disburseToLandlord error', error);
    return { transactionId: externalId, status: 'FAILED', error: 'Network error contacting MoMo' };
  }
}
