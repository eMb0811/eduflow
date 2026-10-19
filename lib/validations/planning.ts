import { z } from 'zod';
import { dayOfWeekSchema } from './schedule';

export const generatePlanningSchema = z.object({
  week_start_date: z.string().optional(),
  academic_goals: z.string().max(500).optional(),
  target_hours_per_day: z.number().min(1).max(12).optional().default(4),
  excluded_days: z.array(dayOfWeekSchema).optional().default([]),
  specific_subjects: z.array(z.string().trim()).optional(),
  preferred_study_slots: z
    .array(
      z.object({
        start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      })
    )
    .optional(),
  save_to_database: z.boolean().optional().default(true),
});

export type GeneratePlanningInput = z.infer<typeof generatePlanningSchema>;
