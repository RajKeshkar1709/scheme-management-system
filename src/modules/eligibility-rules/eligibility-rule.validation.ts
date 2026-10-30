import { z } from 'zod';

export const createEligibilityRuleSchema = z.object({
  ruleCode: z.string().min(2, 'Rule code is required'),
  name: z.string().min(2, 'Name is required'),
  description: z.string().min(2, 'Description is required'),
  ruleDefinition: z.record(z.any(), {
    required_error: 'ruleDefinition object is required',
  }),
});

export const updateEligibilityRuleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  ruleDefinition: z.record(z.any()).optional(),
  reason: z.string().min(3, 'Reason for modification is required'),
});

export type CreateEligibilityRuleInput = z.infer<typeof createEligibilityRuleSchema>;
export type UpdateEligibilityRuleInput = z.infer<typeof updateEligibilityRuleSchema>;
