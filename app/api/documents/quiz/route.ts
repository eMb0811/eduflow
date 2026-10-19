import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { generateQuizSchema } from '@/lib/validations/document';
import { generateStructuredJson } from '@/lib/ai/gemini';
import { QUIZ_GENERATION_PROMPT } from '@/lib/ai/prompts';
import { extractDocumentContent } from '@/lib/courses/document-processor';
import { apiSuccess, apiError } from '@/lib/api/response';
import { GenerateQuizResponseData, GeneratedQuizQuestionItem } from '@/types/api';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs';

/**
 * GET /api/documents/quiz
 * Liste les quiz créés pour l'étudiant avec leurs questions depuis MySQL
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('document_id');

    const quizzes = await prisma.quiz.findMany({
      where: {
        userId: user.id,
        ...(documentId && { documentId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: {
          orderBy: { orderNum: 'asc' },
        },
      },
    });

    return apiSuccess(
      quizzes.map((q) => ({
        id: q.id,
        user_id: q.userId,
        document_id: q.documentId,
        title: q.title,
        description: q.description,
        total_questions: q.totalQuestions,
        best_score: q.bestScore,
        created_at: q.createdAt.toISOString(),
        quiz_questions: q.questions.map((quest) => ({
          id: quest.id,
          quiz_id: quest.quizId,
          question: quest.question,
          options: quest.options ? JSON.parse(quest.options) : [],
          correct_answer_index: quest.correctAnswerIndex,
          explanation: quest.explanation,
          order_num: quest.orderNum,
          created_at: quest.createdAt.toISOString(),
        })),
      }))
    );
  } catch (error) {
    console.error('Erreur GET /api/documents/quiz :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * POST /api/documents/quiz
 * Génère un QCM interactif à choix multiples via Gemini et l'enregistre dans MySQL
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json();
    const validationResult = generateQuizSchema.safeParse(body);

    if (!validationResult.success) {
      return apiError('Paramètres de génération de quiz invalides', 400, {
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const {
      document_id,
      content: directContent,
      topic,
      count = 5,
      save_to_database = true,
    } = validationResult.data;

    let contentToAnalyze = directContent || '';
    let quizTopic = topic || 'Cours académique';

    if (document_id) {
      const doc = await prisma.document.findFirst({
        where: { id: document_id, userId: user.id },
        select: { id: true, title: true, extractedText: true, summary: true, filePath: true, fileType: true },
      });

      if (!doc) {
        return apiError('Document introuvable', 404);
      }

      quizTopic = doc.title;
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
          console.warn('[quiz] Erreur lecture fichier source :', readErr);
        }
      }
    }

    if (!contentToAnalyze || contentToAnalyze.trim().length < 10) {
      return apiError('Contenu insuffisant pour créer un quiz de révision.', 400);
    }

    const prompt = `
THÈME DU QUIZ : "${quizTopic}"
NOMBRE DE QUESTIONS REQUIS : ${count}

CONTENU DU COURS :
${contentToAnalyze}
`;

    let generatedQuiz: {
      title: string;
      description: string;
      questions: GeneratedQuizQuestionItem[];
    };

    try {
      generatedQuiz = await generateStructuredJson<{
        title: string;
        description: string;
        questions: GeneratedQuizQuestionItem[];
      }>(prompt, QUIZ_GENERATION_PROMPT);
    } catch {
      generatedQuiz = {
        title: `Quiz : ${quizTopic}`,
        description: `Évaluation diagnostique sur ${quizTopic}`,
        questions: [
          {
            question: `Quel est l'objectif principal étudié dans « ${quizTopic} » ?`,
            options: [
              'Maîtriser les concepts fondamentaux et leurs applications formelles',
              'Ignorer les contraintes méthodologiques du domaine',
              'Supprimer les étapes de vérification analytique',
              'Appliquer une approche purement aléatoire',
            ],
            correct_answer_index: 0,
            explanation: `Le cours « ${quizTopic} » vise la maîtrise rigoureuse des concepts clés et leur mise en application.`,
          },
          {
            question: `Quelle démarche permet de valider une résolution dans « ${quizTopic} » ?`,
            options: [
              'Vérifier les hypothèses initiales et la cohérence du résultat final',
              'Omettre les conditions aux limites',
              'Ne tester aucun cas particulier',
              'Choisir une formule sans vérifier son domaine de validité',
            ],
            correct_answer_index: 0,
            explanation:
              'Toute démarche académique rigoureuse exige de vérifier les hypothèses avant de conclure.',
          },
        ],
      };
    }

    const validQuestions = (generatedQuiz?.questions || []).slice(0, count);

    let savedQuizId: string | undefined;

    if (save_to_database && validQuestions.length > 0) {
      const quizRecord = await prisma.quiz.create({
        data: {
          userId: user.id,
          documentId: document_id || null,
          title: generatedQuiz.title || `Quiz : ${quizTopic}`,
          description: generatedQuiz.description || 'Test de connaissances',
          totalQuestions: validQuestions.length,
          questions: {
            create: validQuestions.map((q, idx) => ({
              question: q.question,
              options: JSON.stringify(q.options),
              correctAnswerIndex: q.correct_answer_index,
              explanation: q.explanation || null,
              orderNum: idx + 1,
            })),
          },
        },
      });

      savedQuizId = quizRecord.id;
    }

    const responsePayload: GenerateQuizResponseData = {
      quiz_id: savedQuizId,
      document_id,
      title: generatedQuiz.title || `Quiz : ${quizTopic}`,
      description: generatedQuiz.description || 'Test de connaissances',
      questions: validQuestions,
    };

    return apiSuccess<GenerateQuizResponseData>(responsePayload, 201);
  } catch (error) {
    console.error('Erreur POST /api/documents/quiz :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur lors de la génération du quiz',
      500
    );
  }
}
