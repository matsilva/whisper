import { z } from 'zod';

export const PersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  company: z.string().optional(),
  type: z.enum(['team_member', 'customer', 'external', 'unknown']).optional(),
});
