import { z } from 'zod';

export const createSchemeSchema = z.object({
  schemeCode: z
    .string()
    .min(3, 'Scheme code must be at least 3 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Scheme code must be uppercase alphanumeric with dashes/underscores'),
  schemeName: z.string().min(3, 'Scheme name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  amount: z.number().positive('Amount must be positive'),
  applicationDeadline: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format' })
    .transform((date) => new Date(date)),
  eligibilityRuleIds: z.array(z.string().uuid('Invalid eligibility rule ID')).optional(),
});

export const updateSchemeVersionSchema = z.object({
  schemeName: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  amount: z.number().positive().optional(),
  applicationDeadline: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format' })
    .transform((date) => new Date(date))
    .optional(),
  eligibilityRuleIds: z.array(z.string().uuid('Invalid eligibility rule ID')).optional(),
});

export const sendBackSchema = z.object({
  comment: z.string().min(3, 'Comment is required and must explain reasons for sending back'),
});

export const approveSchema = z.object({
  comment: z.string().optional(),
});

export type CreateSchemeInput = z.infer<typeof createSchemeSchema>;
export type UpdateSchemeVersionInput = z.infer<typeof updateSchemeVersionSchema>;
export type SendBackInput = z.infer<typeof sendBackSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;
