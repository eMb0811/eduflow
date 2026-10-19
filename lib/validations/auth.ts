import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Le nom complet doit comporter au moins 2 caractères')
    .max(100, 'Le nom complet ne peut pas dépasser 100 caractères'),
  email: z
    .string()
    .trim()
    .email('Adresse email invalide')
    .max(255),
  password: z
    .string()
    .min(6, 'Le mot de passe doit comporter au moins 6 caractères')
    .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Adresse email invalide'),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
