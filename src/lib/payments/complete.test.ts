import { beforeEach, describe, expect, it, vi } from 'vitest';

const paymentUpdateMany = vi.fn();
vi.mock('@/lib/prisma/client', () => ({
  prisma: { payment: { updateMany: (...args: unknown[]) => paymentUpdateMany(...args) } },
}));

describe('failPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('flips a still-in-flight payment to FAILED', async () => {
    paymentUpdateMany.mockResolvedValue({ count: 1 });

    const { failPayment } = await import('./complete');
    await failPayment('payment-1');

    expect(paymentUpdateMany).toHaveBeenCalledWith({
      where: { id: 'payment-1', status: { notIn: ['COMPLETED', 'REFUNDED'] } },
      data: { status: 'FAILED' },
    });
  });

  it('refuses to downgrade a payment that is already COMPLETED, and logs it', async () => {
    // Reproduces the exact bug: an out-of-order or duplicate webhook
    // delivery reports failure after the payment already succeeded and was
    // ledgered. The conditional WHERE means this update matches zero rows
    // instead of silently overwriting a settled payment.
    paymentUpdateMany.mockResolvedValue({ count: 0 });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { failPayment } = await import('./complete');
    await failPayment('payment-1');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[failPayment] Blocked'),
      expect.objectContaining({ paymentId: 'payment-1' })
    );

    errorSpy.mockRestore();
  });

  it('refuses to downgrade an already-REFUNDED payment the same way', async () => {
    paymentUpdateMany.mockResolvedValue({ count: 0 });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { failPayment } = await import('./complete');
    await failPayment('payment-1');

    expect(paymentUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { notIn: ['COMPLETED', 'REFUNDED'] } }) })
    );
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
