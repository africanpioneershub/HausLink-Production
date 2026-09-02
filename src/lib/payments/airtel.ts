import { fetchWithTimeout } from '@/lib/http/fetchWithTimeout';

type AirtelPaymentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

interface InitiateAirtelPaymentParams {
  phoneNumber: string;
  amount: number;
  reference: string;
  description: string;
}

interface DisburseAirtelToLandlordParams {
  phoneNumber: string;
  amount: number;
  reference: string;
  firstName?: string;
  lastName?: string;
}

interface AirtelPaymentResult {
  transactionId: string;
  status: 'PENDING' | 'FAILED';
  error?: string;
}

const TOKEN_CACHE_DURATION_MS = 50 * 60 * 1000; // 50 minutes

let tokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Airtel Rwanda MSISDNs are sometimes entered as +250788123456 or
 * 250788123456. The Airtel API expects the local 0788123456 form.
 */
function cleanAirtelPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('250')) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith('07')) {
    return digits;
  }
  return digits.startsWith('0') ? digits : `0${digits}`;
}

function isAirtelConfigured(): boolean {
  return !!(process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET && process.env.AIRTEL_BASE_URL);
}

async function getAirtelAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const baseUrl = process.env.AIRTEL_BASE_URL;
  const clientId = process.env.AIRTEL_CLIENT_ID;
  const clientSecret = process.env.AIRTEL_CLIENT_SECRET;

  const res = await fetchWithTimeout(`${baseUrl}/auth/oauth2/token`, {
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
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + TOKEN_CACHE_DURATION_MS,
  };

  return json.access_token;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'X-Country': process.env.AIRTEL_COUNTRY ?? 'RW',
    'X-Currency': process.env.AIRTEL_CURRENCY ?? 'RWF',
  };
}

export async function initiateAirtelPayment({
  phoneNumber,
  amount,
  reference,
  description,
}: InitiateAirtelPaymentParams): Promise<AirtelPaymentResult> {
  if (!isAirtelConfigured()) {
    console.error('[Airtel] Missing required environment variables');
    return { transactionId: reference, status: 'FAILED', error: 'Airtel client not configured' };
  }

  const baseUrl = process.env.AIRTEL_BASE_URL;
  const country = process.env.AIRTEL_COUNTRY ?? 'RW';
  const currency = process.env.AIRTEL_CURRENCY ?? 'RWF';

  try {
    const token = await getAirtelAccessToken();

    const res = await fetchWithTimeout(`${baseUrl}/merchant/v2/payments/`, {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        reference: description,
        subscriber: {
          country,
          currency,
          msisdn: cleanAirtelPhone(phoneNumber),
        },
        transaction: {
          amount,
          country,
          currency,
          id: reference,
        },
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || json?.status?.code !== '200') {
      console.error('[Airtel] payment request failed', res.status, json);
      return {
        transactionId: reference,
        status: 'FAILED',
        error: json?.status?.message ?? 'Failed to initiate payment',
      };
    }

    return { transactionId: reference, status: 'PENDING' };
  } catch (error) {
    console.error('[Airtel] initiateAirtelPayment error', error);
    return { transactionId: reference, status: 'FAILED', error: 'Network error contacting Airtel' };
  }
}

export async function getAirtelPaymentStatus(transactionId: string): Promise<AirtelPaymentStatus> {
  if (!isAirtelConfigured()) {
    console.error('[Airtel] Missing required environment variables');
    return 'FAILED';
  }

  const baseUrl = process.env.AIRTEL_BASE_URL;

  try {
    const token = await getAirtelAccessToken();

    const res = await fetchWithTimeout(`${baseUrl}/standard/v1/payments/${transactionId}`, {
      method: 'GET',
      headers: authHeaders(token),
    });

    if (!res.ok) {
      console.error('[Airtel] getAirtelPaymentStatus failed', res.status);
      return 'PENDING';
    }

    const json = await res.json();
    const status = json?.data?.transaction?.status as string | undefined;

    if (status === 'TS') return 'SUCCESSFUL';
    if (status === 'TF') return 'FAILED';
    return 'PENDING';
  } catch (error) {
    console.error('[Airtel] getAirtelPaymentStatus error', error);
    return 'PENDING';
  }
}

export async function disburseAirtelToLandlord({
  phoneNumber,
  amount,
  reference,
  firstName,
  lastName,
}: DisburseAirtelToLandlordParams): Promise<AirtelPaymentResult> {
  if (!isAirtelConfigured()) {
    console.error('[Airtel] Missing required environment variables');
    return { transactionId: reference, status: 'FAILED', error: 'Airtel client not configured' };
  }

  const baseUrl = process.env.AIRTEL_BASE_URL;

  try {
    const token = await getAirtelAccessToken();

    const res = await fetchWithTimeout(`${baseUrl}/standard/v1/disbursements/`, {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        payee: {
          msisdn: cleanAirtelPhone(phoneNumber),
          first_name: firstName ?? 'Landlord',
          last_name: lastName ?? '',
        },
        reference,
        pin: process.env.AIRTEL_MERCHANT_PIN,
        transaction: {
          amount,
          id: reference,
        },
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || json?.status?.code !== '200') {
      console.error('[Airtel] disbursement request failed', res.status, json);
      return {
        transactionId: reference,
        status: 'FAILED',
        error: json?.status?.message ?? 'Failed to initiate disbursement',
      };
    }

    return { transactionId: reference, status: 'PENDING' };
  } catch (error) {
    console.error('[Airtel] disburseAirtelToLandlord error', error);
    return { transactionId: reference, status: 'FAILED', error: 'Network error contacting Airtel' };
  }
}
