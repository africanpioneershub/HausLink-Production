import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { optionalNonEmpty } from './validation';

describe('optionalNonEmpty', () => {
  const schema = z.object({
    phone: optionalNonEmpty(z.string().min(4).max(20)),
  });

  it('accepts an omitted optional field', () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts an empty string and treats it as absent', () => {
    const result = schema.safeParse({ phone: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });

  it('accepts a whitespace-only string and treats it as absent', () => {
    const result = schema.safeParse({ phone: '   ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });

  it('still validates a non-empty value against the inner schema', () => {
    const result = schema.safeParse({ phone: 'ab' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid non-empty value', () => {
    const result = schema.safeParse({ phone: '+250788123456' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+250788123456');
    }
  });
});
