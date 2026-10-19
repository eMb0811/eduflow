import { z } from 'zod';

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1, 'Le nom complet est requis').max(100).optional(),
  academic_level: z.string().trim().max(100).optional(),
  field_of_study: z.string().trim().max(100).optional(),
  academic_goals: z.union([z.string().max(1000), z.array(z.string())]).optional(),
  avatar_url: z.string().url('URL invalide').optional().or(z.literal('')),
  onboarding_completed: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
