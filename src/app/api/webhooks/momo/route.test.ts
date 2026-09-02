import { beforeEach, describe, expect, it, vi } from 'vitest';

const paymentFindFirst = vi.fn();
vi.mock('@/lib/prisma/client', () => ({
  prisma: { payment: { findFirst: (...args: unknown[]) => paymentFindFirst(...args) } },
}));

const completePayment = vi.fn().mockResolvedValue(undefined);
const failPayment = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/payments/complete', () => ({
  completePayment: (...args: unknown[]) => completePayment(...args),
  failPayment: (...args: unknown[]) => failPayment(...args),
}));

const getMoMoPaymentStatus = vi.fn();
vi.mock('@/lib/payments/momo', () => ({
  getMoMoPaymentStatus: (...args: unknown[]) => getMoMoPaymentStatus(...args),
}));

const VALID_TOKEN = 'the-real-subscription-key';

function makeRequest(body: Record<string, unknown>, token: string | null = VALID_TOKEN) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== null) headers['x-callback-token'] = token;
  return new Request('http://localhost/api/webhooks/momo', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/webhooks/momo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MOMO_SUBSCRIPTION_KEY', VALID_TOKEN);
    paymentFindFirst.mockResolvedValue({ id: 'payment-1', txn_ref: 'payment-1' });
  });

  it('never completes a payment on the callback body alone -- a forged SUCCESSFUL claim is ignored if MTN\'s own status endpoint disagrees', async () => {
    // Reproduces the exact forgery this fix closes: someone who has the
    // (reused, non-body-signing) x-callback-token claims a payment
    // succeeded. Previously this alone completed the payment. Now the
    // callback is only a trigger to re-check MTN's authenticated status
    // endpoint, and that endpoint says the transaction is still pending.
    getMoMoPaymentStatus.mockResolvedValue('PENDING');

    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({ externalId: 'payment-1', status: 'SUCCESSFUL', financialTransactionId: 'fake-ref' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('PENDING');
    expect(getMoMoPaymentStatus).toHaveBeenCalledWith('payment-1');
    expect(completePayment).not.toHaveBeenCalled();
    expect(failPayment).not.toHaveBeenCalled();
  });

  it('completes the payment only when MTN\'s authoritative status is SUCCESSFUL', async () => {
    getMoMoPaymentStatus.mockResolvedValue('SUCCESSFUL');

    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({ externalId: 'payment-1', status: 'SUCCESSFUL', financialTransactionId: 'real-ref' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('COMPLETED');
    expect(completePayment).toHaveBeenCalledWith('payment-1', 'real-ref');
  });

  it('a callback body falsely claiming FAILED does not fail a payment MTN says actually succeeded', async () => {
    getMoMoPaymentStatus.mockResolvedValue('SUCCESSFUL');

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ externalId: 'payment-1', status: 'FAILED' }));
    const json = await res.json();

    expect(json.data.status).toBe('COMPLETED');
    expect(failPayment).not.toHaveBeenCalled();
    expect(completePayment).toHaveBeenCalled();
  });

  it('fails the payment when MTN\'s authoritative status is FAILED', async () => {
    getMoMoPaymentStatus.mockResolvedValue('FAILED');

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ externalId: 'payment-1', status: 'SUCCESSFUL' }));
    const json = await res.json();

    expect(json.data.status).toBe('FAILED');
    expect(failPayment).toHaveBeenCalledWith('payment-1');
    expect(completePayment).not.toHaveBeenCalled();
  });

  it('rejects a request with a wrong or missing callback token', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({ externalId: 'payment-1', status: 'SUCCESSFUL' }, 'wrong-token'));

    expect(res.status).toBe(401);
    expect(getMoMoPaymentStatus).not.toHaveBeenCalled();
  });

  it('acknowledges without querying MTN when no payment matches the reference', async () => {
    paymentFindFirst.mockResolvedValue(null);

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ externalId: 'unknown-payment', status: 'SUCCESSFUL' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('IGNORED');
    expect(getMoMoPaymentStatus).not.toHaveBeenCalled();
  });
});
