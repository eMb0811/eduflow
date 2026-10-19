import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import { ensureDefaultScheduleEntries } from '@/lib/schedule/auto-planner';
import { processCourseDocumentWithAi } from '@/lib/courses/document-processor';

export const dynamic = 'force-dynamic';

const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

function safeParseConcepts(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return [raw];
  }
}

/**
 * GET /api/courses
 * Retourne l'ensemble des sessions de cours générées automatiquement
 * à partir de l'Emploi du Temps et synchronisées avec les supports de cours.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    // 1. Récupérer ou initialiser l'emploi du temps
    const scheduleEntries = await ensureDefaultScheduleEntries(user.id);

    // 2. Synchroniser les matières dans la table Subject pour garantir que chaque matière de l'EDT existe
    const uniqueSubjects = Array.from(new Set(scheduleEntries.map((e) => e.subjectName)));
    for (const name of uniqueSubjects) {
      const sample = scheduleEntries.find((e) => e.subjectName === name);
      let subj = await prisma.subject.findFirst({
        where: { userId: user.id, name },
      });
      if (!subj) {
        subj = await prisma.subject.create({
          data: {
            userId: user.id,
            name,
            color: sample?.color || '#4F46E5',
            professor: sample?.professor || null,
          },
        });
      }
      // Rattacher les entrées qui n'ont pas encore de subjectId
      await prisma.scheduleEntry.updateMany({
        where: { userId: user.id, subjectName: name, subjectId: null },
        data: { subjectId: subj.id },
      });
    }

    // 3. Charger les matières avec leurs documents, flashcards et quiz
    const subjects = await prisma.subject.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
      include: {
        scheduleEntries: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            flashcards: true,
            quizzes: {
              include: {
                questions: {
                  orderBy: { orderNum: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    // 4. Charger également tous les documents de l'utilisateur
    const allDocs = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        subject: true,
        flashcards: true,
        quizzes: {
          include: {
            questions: {
              orderBy: { orderNum: 'asc' },
            },
          },
        },
      },
    });

    const formattedDocs = allDocs.map((doc) => {
      const bestQuizScore =
        doc.quizzes.length > 0
          ? Math.max(...doc.quizzes.map((q) => q.bestScore ?? 0))
          : 0;

      return {
        id: doc.id,
        user_id: doc.userId,
        subject_id: doc.subjectId,
        subject_name: doc.subject?.name || 'Cours Général',
        subject_color: doc.subject?.color || '#4F46E5',
        title: doc.title,
        file_url: doc.fileUrl,
        file_path: doc.filePath,
        file_type: doc.fileType,
        file_size: doc.fileSize ? Number(doc.fileSize) : null,
        extracted_text: doc.extractedText,
        summary: doc.summary,
        key_concepts: safeParseConcepts(doc.keyConcepts),
        flashcards_count: doc.flashcards.length,
        quizzes_count: doc.quizzes.length,
        mastery_score: bestQuizScore,
        created_at: doc.createdAt.toISOString(),
        updated_at: doc.updatedAt.toISOString(),
      };
    });

    // 5. Formater chaque session de cours générée automatiquement
    const formattedSessions = subjects.map((subj) => {
      const entries = subj.scheduleEntries || [];
      const docs = subj.documents || [];

      const totalFlashcards = docs.reduce((acc, d) => acc + d.flashcards.length, 0);
      const totalQuizzes = docs.reduce((acc, d) => acc + d.quizzes.length, 0);
      const allScores = docs.flatMap((d) => d.quizzes.map((q) => q.bestScore ?? 0));
      const bestScore = allScores.length > 0 ? Math.max(...allScores) : 0;

      const scheduleDetails = entries.map((e) => {
        const dayFr = DAY_LABELS[e.dayOfWeek.toLowerCase()] || e.dayOfWeek;
        return {
          id: e.id,
          dayOfWeek: e.dayOfWeek,
          dayLabel: dayFr,
          startTime: e.startTime,
          endTime: e.endTime,
          room: e.room,
          professor: e.professor,
          formatted: `${dayFr} ${e.startTime} - ${e.endTime}${e.room ? ` (${e.room})` : ''}`,
        };
      });

      const summaryText =
        scheduleDetails.length > 0
          ? `${scheduleDetails.length} séance${scheduleDetails.length > 1 ? 's' : ''} / semaine • ${scheduleDetails
              .map((s) => `${s.dayLabel} ${s.startTime}-${s.endTime}`)
              .join(', ')}`
          : 'Matière académique active';

      return {
        id: subj.id,
        name: subj.name,
        color: subj.color || '#4F46E5',
        professor: subj.professor || entries[0]?.professor || null,
        schedule_count: scheduleDetails.length,
        schedule_summary: summaryText,
        schedule_slots: scheduleDetails,
        documents_count: docs.length,
        documents: docs.map((doc) => {
          const score =
            doc.quizzes.length > 0
              ? Math.max(...doc.quizzes.map((q) => q.bestScore ?? 0))
              : 0;
          return {
            id: doc.id,
            title: doc.title,
            file_url: doc.fileUrl,
            file_type: doc.fileType,
            summary: doc.summary,
            key_concepts: safeParseConcepts(doc.keyConcepts),
            flashcards_count: doc.flashcards.length,
            quizzes_count: doc.quizzes.length,
            mastery_score: score,
            created_at: doc.createdAt.toISOString(),
          };
        }),
        flashcards_count: totalFlashcards,
        quizzes_count: totalQuizzes,
        mastery_score: bestScore,
        has_source: docs.length > 0,
      };
    });

    // Trier les sessions par activité la plus récente (nouveaux cours ou révisions récentes en premier)
    formattedSessions.sort((a, b) => {
      const getLatestTimestamp = (s: typeof a) => {
        if (!s.documents || s.documents.length === 0) return 0;
        return Math.max(...s.documents.map((d) => new Date(d.created_at).getTime()));
      };
      const timeA = getLatestTimestamp(a);
      const timeB = getLatestTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;
      return a.name.localeCompare(b.name);
    });

    return apiSuccess({
      sessions: formattedSessions,
      documents: formattedDocs,
      total_sessions: formattedSessions.length,
      total_documents: formattedDocs.length,
    });
  } catch (error) {
    console.error('Erreur GET /api/courses :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * POST /api/courses
 * Génère automatiquement un Pack Kocc pour une matière de l'Emploi du Temps
 * (Synthèse structurée, Flashcards, Quiz) sans fichier PDF préalable
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json();
    const { subject_name, subject_id, theme } = body;

    if (!subject_name) {
      return apiError('Le nom de la matière est obligatoire (subject_name)', 400);
    }

    let targetSubject = null;
    if (subject_id) {
      targetSubject = await prisma.subject.findFirst({
        where: { id: subject_id, userId: user.id },
      });
    }
    if (!targetSubject) {
      targetSubject = await prisma.subject.findFirst({
        where: { name: subject_name, userId: user.id },
      });
    }

    if (!targetSubject) {
      targetSubject = await prisma.subject.create({
        data: {
          userId: user.id,
          name: subject_name,
          color: '#4F46E5',
        },
      });
    }

    const scheduleEntries = await prisma.scheduleEntry.findMany({
      where: { userId: user.id },
      select: { subjectName: true, color: true },
    });
    const scheduleSubjects = scheduleEntries.map((e) => ({
      name: e.subjectName,
      color: e.color || '#4F46E5',
    }));

    // Récupérer le niveau académique du profil
    const userProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { academicLevel: true },
    });

    // Analyse et génération par IA avec Gemini 3.8 Flash
    const packTitle = theme
      ? `${theme} — ${targetSubject.name}`
      : `Fondamentaux et Maîtrise — ${targetSubject.name}`;

    const analysis = await processCourseDocumentWithAi({
      rawTitle: packTitle,
      extractedText: `Programme de cours universitaire pour la discipline "${targetSubject.name}". ${theme ? `Thème spécifique : ${theme}.` : ''} Génère une synthèse rigoureuse, les concepts clés incontournables, des flashcards actives et un quiz d'évaluation d'examen.`,
      scheduleSubjects,
      explicitSubjectName: targetSubject.name,
      academicLevel: userProfile?.academicLevel,
    });

    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        subjectId: targetSubject.id,
        title: analysis.cleanTitle,
        fileUrl: '#kocc-pack-virtuel',
        filePath: '#kocc-pack-virtuel',
        fileType: 'application/kocc-pack',
        extractedText: analysis.summary,
        summary: analysis.summary,
        keyConcepts: JSON.stringify(analysis.keyConcepts),
      },
    });

    if (analysis.flashcards.length > 0) {
      await prisma.flashcard.createMany({
        data: analysis.flashcards.map((f) => ({
          userId: user.id,
          documentId: doc.id,
          subjectId: targetSubject.id,
          question: f.question,
          answer: f.answer,
          difficulty: f.difficulty,
        })),
      });
    }

    if (analysis.quizQuestions.length > 0) {
      const quiz = await prisma.quiz.create({
        data: {
          userId: user.id,
          documentId: doc.id,
          title: `Quiz de Maîtrise — ${analysis.cleanTitle}`,
          description: `Évaluation diagnostique générée par Kocc pour consolider ${targetSubject.name}.`,
          totalQuestions: analysis.quizQuestions.length,
          bestScore: null,
        },
      });

      await prisma.quizQuestion.createMany({
        data: analysis.quizQuestions.map((q, idx) => ({
          quizId: quiz.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation,
          orderNum: idx + 1,
        })),
      });
    }

    return apiSuccess({
      message: `Pack de révision généré avec succès pour ${targetSubject.name}`,
      document_id: doc.id,
      title: doc.title,
    });
  } catch (error) {
    console.error('Erreur POST /api/courses :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
