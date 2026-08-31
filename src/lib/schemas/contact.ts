import { z } from 'zod';
import { optionalNonEmpty } from '@/lib/validation';

export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  email: z.string().email('Enter a valid email address'),
  subject: z.string().min(2, 'Subject must be at least 2 characters').max(150),
  message: z.string().min(5, 'Message must be at least 5 characters').max(5000),
  phone: optionalNonEmpty(z.string().min(4).max(20)),
});
