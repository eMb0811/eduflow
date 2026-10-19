import { z } from 'zod';

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Le titre du document est requis').max(255),
  file_url: z.string().min(1, 'URL ou chemin du fichier requis'),
  file_path: z.string().min(1, 'Le chemin du fichier est requis'),
  file_type: z.string().max(100).optional(),
  file_size: z.number().int().nonnegative().optional(),
  subject_id: z.string().uuid().optional(),
  extracted_text: z.string().optional(),
});

export const summarizeDocumentSchema = z.object({
  document_id: z.string().uuid().optional(),
  content: z.string().trim().min(10, 'Le contenu doit comporter au moins 10 caractères').optional(),
  title: z.string().max(255).optional(),
  language: z.enum(['fr', 'en']).optional().default('fr'),
}).refine(data => data.document_id || data.content, {
  message: 'Veuillez fournir un document_id ou un contenu textuel',
});

export const generateFlashcardsSchema = z.object({
  document_id: z.string().uuid().optional(),
  content: z.string().trim().min(10, 'Le contenu doit comporter au moins 10 caractères').optional(),
  subject_id: z.string().uuid().optional(),
  count: z.number().int().min(1).max(30).optional().default(10),
  save_to_database: z.boolean().optional().default(true),
}).refine(data => data.document_id || data.content, {
  message: 'Veuillez fournir un document_id ou un contenu textuel',
});

export const generateQuizSchema = z.object({
  document_id: z.string().uuid().optional(),
  content: z.string().trim().min(10, 'Le contenu doit comporter au moins 10 caractères').optional(),
  topic: z.string().max(200).optional(),
  count: z.number().int().min(1).max(20).optional().default(5),
  save_to_database: z.boolean().optional().default(true),
}).refine(data => data.document_id || data.content, {
  message: 'Veuillez fournir un document_id ou un contenu textuel',
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type SummarizeDocumentInput = z.infer<typeof summarizeDocumentSchema>;
export type GenerateFlashcardsInput = z.infer<typeof generateFlashcardsSchema>;
export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;
