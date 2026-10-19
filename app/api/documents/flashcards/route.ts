import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { generateFlashcardsSchema } from '@/lib/validations/document';
import { generateStructuredJson } from '@/lib/ai/gemini';
import { FLASHCARDS_GENERATION_PROMPT } from '@/lib/ai/prompts';
import { extractDocumentContent } from '@/lib/courses/document-processor';
import { apiSuccess, apiError } from '@/lib/api/response';
import { GenerateFlashcardsResponseData, GeneratedFlashcardItem } from '@/types/api';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs';

/**
 * GET /api/documents/flashcards
 * Liste les flashcards de l'étudiant (filtrables par document_id ou subject_id) depuis MySQL
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('document_id');
    const subjectId = searchParams.get('subject_id');

    const flashcards = await prisma.flashcard.findMany({
      where: {
        userId: user.id,
        ...(documentId && { documentId }),
        ...(subjectId && { subjectId }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(
      flashcards.map((f) => ({
        id: f.id,
        user_id: f.userId,
        document_id: f.documentId,
        subject_id: f.subjectId,
        question: f.question,
        answer: f.answer,
        difficulty: f.difficulty,
        review_count: f.reviewCount,
        last_reviewed_at: f.lastReviewedAt?.toISOString() || null,
        created_at: f.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Erreur GET /api/documents/flashcards :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * POST /api/documents/flashcards
 * Génère des flashcards de mémorisation active avec Gemini et les sauvegarde dans MySQL
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json();
    const validationResult = generateFlashcardsSchema.safeParse(body);

    if (!validationResult.success) {
      return apiError('Paramètres de génération de flashcards invalides', 400, {
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const {
      document_id,
      content: directContent,
      subject_id,
      count = 10,
      save_to_database = true,
    } = validationResult.data;

    let contentToAnalyze = directContent || '';
    let resolvedSubjectId = subject_id;

    if (document_id) {
      const doc = await prisma.document.findFirst({
        where: { id: document_id, userId: user.id },
        select: { id: true, title: true, extractedText: true, summary: true, subjectId: true, filePath: true, fileType: true },
      });

      if (!doc) {
        return apiError('Document introuvable', 404);
      }

      if (!resolvedSubjectId && doc.subjectId) {
        resolvedSubjectId = doc.subjectId;
      }

      if (!contentToAnalyze) {
        contentToAnalyze = doc.extractedText || doc.summary || doc.title;
      }

      // Si le texte n'était pas extrait en base mais que le fichier existe sur le disque
      if ((!doc.extractedText || doc.extractedText.trim().length < 30) && doc.filePath) {
        try {
          if (fs.existsSync(doc.filePath)) {
            const buf = fs.readFileSync(doc.filePath);
            const extracted = await extractDocumentContent(buf, doc.title, doc.fileType || 'application/pdf');
            if (extracted && extracted.trim().length > 30) {
              contentToAnalyze = extracted;
              await prisma.document.update({
                where: { id: doc.id },
                data: { extractedText: extracted },
              });
            }
          }
        } catch (readErr) {
          console.warn('[flashcards] Erreur lecture fichier source :', readErr);
        }
      }
    }

    if (!contentToAnalyze || contentToAnalyze.trim().length < 10) {
      return apiError('Contenu insuffisant pour concevoir des flashcards.', 400);
    }

    const prompt = `
Génère EXACTEMENT ${count} cartes mémoires (flashcards) à partir du cours suivant :

CONTENU DU COURS :
${contentToAnalyze}
`;

    let validCards: GeneratedFlashcardItem[] = [];
    try {
      const generated = await generateStructuredJson<{
        flashcards: GeneratedFlashcardItem[];
      }>(prompt, FLASHCARDS_GENERATION_PROMPT);
      validCards = (generated?.flashcards || []).slice(0, count);
    } catch (genErr) {
      console.error('[Flashcards API] Échec génération IA :', genErr);
      return apiError(
        "Impossible de générer des flashcards à partir de ce contenu. Veuillez vérifier la lisibilité du cours.",
        422
      );
    }

    if (validCards.length === 0) {
      return apiError(
        "Aucune flashcard n'a pu être extraite de ce contenu.",
        422
      );
    }

    const savedCards: (GeneratedFlashcardItem & { id?: string })[] = [];

    if (save_to_database && validCards.length > 0) {
      const inserted = await prisma.$transaction(
        validCards.map((c) =>
          prisma.flashcard.create({
            data: {
              userId: user.id,
              documentId: document_id || null,
              subjectId: resolvedSubjectId || null,
              question: c.question,
              answer: c.answer,
              difficulty: c.difficulty || 'medium',
            },
          })
        )
      );

      inserted.forEach((card) => {
        savedCards.push({
          id: card.id,
          question: card.question,
          answer: card.answer,
          difficulty: card.difficulty as 'easy' | 'medium' | 'hard',
        });
      });
    }

    const finalCards = savedCards.length > 0 ? savedCards : validCards;

    const responsePayload: GenerateFlashcardsResponseData = {
      document_id,
      count: finalCards.length,
      flashcards: finalCards,
    };

    return apiSuccess<GenerateFlashcardsResponseData>(responsePayload, 201);
  } catch (error) {
    console.error('Erreur POST /api/documents/flashcards :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur lors de la génération des cartes mémoires',
      500
    );
  }
}
