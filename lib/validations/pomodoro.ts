import { z } from 'zod';

export const pomodoroTypeSchema = z.enum(['study', 'short_break', 'long_break']);

export const createPomodoroSchema = z.object({
  duration_minutes: z.number().int().min(1).max(180),
  type: pomodoroTypeSchema.default('study'),
  subject_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  completed_at: z.string().datetime().optional(),
});

export type CreatePomodoroInput = z.infer<typeof createPomodoroSchema>;
