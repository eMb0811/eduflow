import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/documents/quiz/submit
 * Évalue les réponses soumises par l'étudiant ou enregistre son score de maîtrise,
 * et synchronise automatiquement un créneau de révision prioritaire si le score est < 70%.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json();
    const { quiz_id, document_id, score_percentage, answers } = body;

    // Mode direct depuis Révision Express ou QuizPlayer avec document_id
    if (document_id && typeof score_percentage === 'number') {
      const percentage = Math.max(0, Math.min(100, Math.round(score_percentage)));

      const doc = await prisma.document.findFirst({
        where: { id: document_id, userId: user.id },
        include: { subject: true, quizzes: true },
      });

      if (!doc) {
        return apiError('Document introuvable', 404);
      }

      if (doc.quizzes.length > 0) {
        const targetQuiz = doc.quizzes[0];
        await prisma.quiz.update({
          where: { id: targetQuiz.id },
          data: { bestScore: percentage },
        });
      } else {
        await prisma.quiz.create({
          data: {
            userId: user.id,
            documentId: doc.id,
            title: `Évaluation — ${doc.title}`,
            totalQuestions: 4,
            bestScore: percentage,
          },
        });
      }

      let planningSynced = false;
      if (percentage < 70) {
        let activePlan = await prisma.revisionPlan.findFirst({
          where: { userId: user.id, isActive: true },
          orderBy: { createdAt: 'desc' },
        });

        if (!activePlan) {
          activePlan = await prisma.revisionPlan.create({
            data: {
              userId: user.id,
              title: 'Planning de révision actif',
              isActive: true,
            },
          });
        }

        await prisma.revisionSlot.create({
          data: {
            planId: activePlan.id,
            userId: user.id,
            subjectName: doc.subject?.name || 'Révision Prioritaire',
            dayOfWeek: 'wednesday',
            startTime: '16:30',
            endTime: '18:00',
            focusTopic: `Renforcement ciblé (${percentage}%) : ${doc.title}`,
            priority: 'high',
            status: 'pending',
          },
        });
        planningSynced = true;
      }

      return apiSuccess({
        percentage,
        mastery_score: percentage,
        planning_synced: planningSynced,
      });
    }

    if (!quiz_id) {
      return apiError('quiz_id ou document_id est requis', 400);
    }

    const questions = await prisma.quizQuestion.findMany({
      where: { quizId: quiz_id },
    });

    if (!questions || questions.length === 0) {
      return apiError('Questions de quiz introuvables', 404);
    }

    let score = 0;
    const total = questions.length;
    const details = [];

    for (const q of questions) {
      const selectedIndex = answers ? answers[q.id] : undefined;
      const isCorrect = selectedIndex === q.correctAnswerIndex;

      if (isCorrect) {
        score += 1;
      }

      details.push({
        question_id: q.id,
        correct: isCorrect,
        correct_answer: q.correctAnswerIndex,
        user_answer: selectedIndex !== undefined ? selectedIndex : -1,
        explanation: q.explanation || undefined,
      });
    }

    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    const quizData = await prisma.quiz.findFirst({
      where: { id: quiz_id, userId: user.id },
      include: { document: { include: { subject: true } } },
    });

    if (quizData) {
      await prisma.quiz.update({
        where: { id: quiz_id },
        data: { bestScore: percentage },
      });
    }

    let planningSynced = false;
    if (percentage < 70 && quizData?.document) {
      let activePlan = await prisma.revisionPlan.findFirst({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (activePlan) {
        await prisma.revisionSlot.create({
          data: {
            planId: activePlan.id,
            userId: user.id,
            subjectName: quizData.document.subject?.name || 'Révision Prioritaire',
            dayOfWeek: 'thursday',
            startTime: '17:00',
            endTime: '18:30',
            focusTopic: `Consolidation (${percentage}%) : ${quizData.document.title}`,
            priority: 'high',
            status: 'pending',
          },
        });
        planningSynced = true;
      }
    }

    return apiSuccess({
      score,
      total,
      percentage,
      planning_synced: planningSynced,
      details,
    });
  } catch (error) {
    console.error('Erreur POST /api/documents/quiz/submit :', error);
    return apiError(
      error instanceof Error ? error.message : "Erreur lors de l'évaluation du quiz",
      500
    );
  }
}
