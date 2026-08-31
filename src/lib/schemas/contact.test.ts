import { describe, expect, it } from 'vitest';
import { contactSchema } from './contact';

const validPayload = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'A question about listings',
  message: 'Hello, I have a question about a listing.',
};

describe('contactSchema', () => {
  it('rejected an empty-string phone before the fix; now accepts it as absent', () => {
    const result = contactSchema.safeParse({ ...validPayload, phone: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });

  it('accepts the payload with phone omitted entirely', () => {
    const result = contactSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('still validates a provided phone number', () => {
    const result = contactSchema.safeParse({ ...validPayload, phone: 'xx' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid phone number', () => {
    const result = contactSchema.safeParse({ ...validPayload, phone: '+250788937487' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+250788937487');
    }
  });
});
