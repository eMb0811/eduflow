import { z } from 'zod';

export const sendChatMessageSchema = z.object({
  message: z.string().trim().min(1, 'Le message ne peut pas être vide').max(4000),
  session_id: z.string().uuid().optional(),
  subject_name: z.string().trim().max(100).optional(),
  document_id: z.string().uuid().optional(),
  context: z.string().max(8000).optional(),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
