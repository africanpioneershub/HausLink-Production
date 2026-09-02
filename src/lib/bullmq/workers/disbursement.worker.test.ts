import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUnique = vi.fn();
const ledgerUpdate = vi.fn().mockResolvedValue({});
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    ledgerEntry: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => ledgerUpdate(...args),
    },
  },
}));

const disburseToLandlord = vi.fn();
vi.mock('@/lib/payments/momo', () => ({
  disburseToLandlord: (...args: unknown[]) => disburseToLandlord(...args),
}));

const sendWhatsAppMessage = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/whatsapp/client', () => ({
  sendWhatsAppMessage: (...args: unknown[]) => sendWhatsAppMessage(...args),
}));

function makeLedgerEntry(
  overrides: { kyc_status?: string; disbursement_status?: string; payment_status?: string } = {}
) {
  return {
    id: 'ledger-1',
    payment_id: 'payment-1',
    landlord_net_rwf: 95000,
    disbursement_status: overrides.disbursement_status ?? 'PENDING',
    payment: {
      status: overrides.payment_status ?? 'COMPLETED',
      landlord: {
        id: 'landlord-1',
        phone: '+250788000000',
        kyc_status: overrides.kyc_status ?? 'APPROVED',
        preferences: { payout_momo_number: '+250788000000' },
      },
    },
  };
}

describe('disbursement.worker -- payment-status gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks the payout when the payment has been flagged for refund, logs an ERROR, and marks the ledger entry FAILED', async () => {
    // Reproduces the exact gap: the admin "flag for refund" action only
    // touches Payment.status, never the ledger entry -- without this check,
    // a refunded payment would still disburse in full.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    findUnique.mockResolvedValue(makeLedgerEntry({ payment_status: 'REFUND_REQUESTED' }));

    const { processLedgerEntry } = await import('./disbursement.worker');
    await processLedgerEntry('ledger-1');

    expect(disburseToLandlord).not.toHaveBeenCalled();
    expect(ledgerUpdate).toHaveBeenCalledWith({
      where: { id: 'ledger-1' },
      data: { disbursement_status: 'FAILED' },
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[disbursement.worker]'),
      expect.objectContaining({ paymentId: 'payment-1', paymentStatus: 'REFUND_REQUESTED' })
    );

    errorSpy.mockRestore();
  });

  it('blocks the payout for a FAILED payment the same way', async () => {
    findUnique.mockResolvedValue(makeLedgerEntry({ payment_status: 'FAILED' }));

    const { processLedgerEntry } = await import('./disbursement.worker');
    await processLedgerEntry('ledger-1');

    expect(disburseToLandlord).not.toHaveBeenCalled();
    expect(ledgerUpdate).toHaveBeenCalledWith({
      where: { id: 'ledger-1' },
      data: { disbursement_status: 'FAILED' },
    });
  });

  it('proceeds normally for a COMPLETED payment -- unrelated to the KYC gate below', async () => {
    findUnique.mockResolvedValue(makeLedgerEntry({ payment_status: 'COMPLETED' }));
    disburseToLandlord.mockResolvedValue({ transactionId: 'txn-1', status: 'PENDING' });

    const { processLedgerEntry } = await import('./disbursement.worker');
    await processLedgerEntry('ledger-1');

    expect(disburseToLandlord).toHaveBeenCalled();
  });
});

describe('disbursement.worker -- KYC gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks the payout for a landlord without verified KYC, logs an ERROR, and marks the ledger entry FAILED', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    findUnique.mockResolvedValue(makeLedgerEntry({ kyc_status: 'NOT_SUBMITTED' }));

    const { processLedgerEntry } = await import('./disbursement.worker');
    await processLedgerEntry('ledger-1');

    expect(disburseToLandlord).not.toHaveBeenCalled();
    expect(ledgerUpdate).toHaveBeenCalledWith({
      where: { id: 'ledger-1' },
      data: { disbursement_status: 'FAILED' },
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[disbursement.worker]'),
      expect.objectContaining({ landlordId: 'landlord-1', kycStatus: 'NOT_SUBMITTED' })
    );

    errorSpy.mockRestore();
  });

  it('blocks the payout for KYC status PENDING (submitted but not yet reviewed) the same way', async () => {
    findUnique.mockResolvedValue(makeLedgerEntry({ kyc_status: 'PENDING' }));

    const { processLedgerEntry } = await import('./disbursement.worker');
    await processLedgerEntry('ledger-1');

    expect(disburseToLandlord).not.toHaveBeenCalled();
    expect(ledgerUpdate).toHaveBeenCalledWith({
      where: { id: 'ledger-1' },
      data: { disbursement_status: 'FAILED' },
    });
  });

  it('proceeds normally for a landlord with verified (APPROVED) KYC -- money-movement call mocked, not hit for real', async () => {
    findUnique.mockResolvedValue(makeLedgerEntry({ kyc_status: 'APPROVED' }));
    disburseToLandlord.mockResolvedValue({ transactionId: 'txn-1', status: 'PENDING' });

    const { processLedgerEntry } = await import('./disbursement.worker');
    await processLedgerEntry('ledger-1');

    expect(disburseToLandlord).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '+250788000000', amount: 95000 })
    );
    expect(ledgerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ledger-1' },
        data: expect.objectContaining({ disbursement_status: 'COMPLETED' }),
      })
    );
  });

  it('does not touch an entry that is not PENDING (already processed)', async () => {
    findUnique.mockResolvedValue(makeLedgerEntry({ disbursement_status: 'COMPLETED' }));

    const { processLedgerEntry } = await import('./disbursement.worker');
    await processLedgerEntry('ledger-1');

    expect(disburseToLandlord).not.toHaveBeenCalled();
    expect(ledgerUpdate).not.toHaveBeenCalled();
  });
});
