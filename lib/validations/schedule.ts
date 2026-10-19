import { z } from 'zod';

export const dayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

export const scheduleItemSchema = z.object({
  subject_name: z.string().trim().min(1, 'Le nom de la matière est requis').max(100),
  day_of_week: dayOfWeekSchema,
  start_time: z
    .string()
    .trim()
    .regex(timeFormatRegex, "Format d'heure de début invalide (attendu HH:mm)"),
  end_time: z
    .string()
    .trim()
    .regex(timeFormatRegex, "Format d'heure de fin invalide (attendu HH:mm)"),
  room: z.string().trim().max(50).nullable().optional(),
  professor: z.string().trim().max(100).nullable().optional(),
  color: z.string().trim().max(30).optional().default('#3B82F6'),
});

export const saveScheduleEntriesSchema = z.object({
  entries: z.array(scheduleItemSchema).min(1, 'Au moins un cours doit être fourni'),
  replace_existing: z.boolean().optional().default(false),
});

export const updateScheduleEntrySchema = scheduleItemSchema.partial();

export type ScheduleItemInput = z.infer<typeof scheduleItemSchema>;
export type SaveScheduleEntriesInput = z.infer<typeof saveScheduleEntriesSchema>;
