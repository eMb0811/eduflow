import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { summarizeDocumentSchema } from '@/lib/validations/document';
import { generateStructuredJson } from '@/lib/ai/gemini';
import { DOCUMENT_SUMMARY_PROMPT } from '@/lib/ai/prompts';
import { extractDocumentContent } from '@/lib/courses/document-processor';
import { apiSuccess, apiError } from '@/lib/api/response';
import { DocumentSummaryResponseData } from '@/types/api';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs';

/**
 * POST /api/documents/summarize
 * Génère un résumé pédagogique et extrait les concepts clés avec Gemini et sauvegarde dans MySQL
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json();
    const validationResult = summarizeDocumentSchema.safeParse(body);

    if (!validationResult.success) {
      return apiError('Paramètres de résumé invalides', 400, {
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { document_id, content: directContent, title: directTitle } = validationResult.data;

    let contentToSummarize = directContent || '';
    let documentTitle = directTitle || 'Document de cours';

    // Si un ID de document est fourni, récupérer le texte depuis MySQL (avec extraction disque en secours)
    if (document_id) {
      const doc = await prisma.document.findFirst({
        where: { id: document_id, userId: user.id },
        select: { id: true, title: true, extractedText: true, summary: true, filePath: true, fileType: true },
      });

      if (!doc) {
        return apiError('Document introuvable', 404);
      }

      documentTitle = doc.title;
      if (!contentToSummarize && doc.extractedText) {
        contentToSummarize = doc.extractedText;
      }

      // Si le texte n'était pas extrait en base mais que le fichier existe sur le disque
      if ((!contentToSummarize || contentToSummarize.trim().length < 30) && doc.filePath) {
        try {
          if (fs.existsSync(doc.filePath)) {
            const buf = fs.readFileSync(doc.filePath);
            const extracted = await extractDocumentContent(buf, doc.title, doc.fileType || 'application/pdf');
            if (extracted && extracted.trim().length > 30) {
              contentToSummarize = extracted;
              await prisma.document.update({
                where: { id: doc.id },
                data: { extractedText: extracted },
              });
            }
          }
        } catch (readErr) {
          console.warn('[summarize] Erreur lecture fichier source :', readErr);
        }
      }
    }

    if (!contentToSummarize || contentToSummarize.trim().length < 10) {
      return apiError('Le contenu du cours est insuffisant pour générer un résumé pertinent.', 400);
    }

    const prompt = `
DOCUMENT : "${documentTitle}"

CONTENU DU DOCUMENT :
${contentToSummarize}
`;

    // Utilisation de Gemini pour générer le résumé (ou extraction structurée locale en fallback)
    let summaryResult: {
      title: string;
      summary: string;
      key_concepts: string[];
      recommended_review_topics: string[];
    };

    try {
      summaryResult = await generateStructuredJson<{
        title: string;
        summary: string;
        key_concepts: string[];
        recommended_review_topics: string[];
      }>(prompt, DOCUMENT_SUMMARY_PROMPT);
    } catch (sumErr) {
      console.error('[Summarize API] Échec génération IA :', sumErr);
      return apiError(
        "Impossible de générer le résumé pédagogique pour ce document. Veuillez vous assurer que le fichier contient un texte lisible.",
        422
      );
    }

    // Mise à jour du document dans MySQL
    if (document_id && summaryResult) {
      await prisma.document.update({
        where: { id: document_id },
        data: {
          summary: summaryResult.summary,
          keyConcepts: JSON.stringify(summaryResult.key_concepts || []),
        },
      });
    }

    const responsePayload: DocumentSummaryResponseData = {
      document_id,
      title: summaryResult.title || documentTitle,
      summary: summaryResult.summary,
      key_concepts: summaryResult.key_concepts || [],
      recommended_review_topics: summaryResult.recommended_review_topics || [],
    };

    return apiSuccess<DocumentSummaryResponseData>(responsePayload);
  } catch (error) {
    console.error('Erreur POST /api/documents/summarize :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur lors de la génération du résumé',
      500
    );
  }
}
