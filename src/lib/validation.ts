import { z } from 'zod';

/**
 * Wraps an optional Zod schema so an empty or whitespace-only string is
 * treated as absent instead of being validated against the inner schema.
 * Without this, `z.string().min(N).optional()` still rejects "" because
 * optional() only skips validation for `undefined`, not for empty strings
 * that a form submits for a blank optional field.
 */
export function optionalNonEmpty<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional()
  );
}
