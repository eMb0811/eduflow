import { z } from 'zod';

export const adminCreateUserSchema = z.object({
  email: z.string().email('Adresse email invalide').toLowerCase().trim(),
  password: z
    .string()
    .min(6, 'Le mot de passe doit comporter au moins 6 caractères'),
  role: z.enum(['student', 'admin', 'superadmin']).default('student'),
  fullName: z.string().max(100).optional().nullable(),
  academicLevel: z.string().max(60).optional().nullable(),
  fieldOfStudy: z.string().max(100).optional().nullable(),
});

export const adminUpdateUserSchema = z.object({
  role: z.enum(['student', 'admin', 'superadmin']).optional(),
  fullName: z.string().max(100).optional().nullable(),
  academicLevel: z.string().max(60).optional().nullable(),
  fieldOfStudy: z.string().max(100).optional().nullable(),
  newPassword: z
    .string()
    .min(6, 'Le mot de passe doit comporter au moins 6 caractères')
    .optional()
    .nullable(),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
