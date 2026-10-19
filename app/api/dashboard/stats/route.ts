import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

function getCurrentDayOfWeek(): string {
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return days[new Date().getDay()];
}

/**
 * GET /api/dashboard/stats
 * Agrège toutes les métriques clés de l'étudiant depuis MySQL en une seule requête optimisée
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const currentDay = getCurrentDayOfWeek();

    const [
      profile,
      todaySchedule,
      todaySlots,
      pomodoroData,
      flashcardsCount,
      totalDocsCount,
      recentDocs,
    ] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: user.id },
      }),
      prisma.scheduleEntry.findMany({
        where: { userId: user.id, dayOfWeek: currentDay },
        orderBy: { startTime: 'asc' },
      }),
      prisma.revisionSlot.findMany({
        where: { userId: user.id, dayOfWeek: currentDay },
        orderBy: { startTime: 'asc' },
      }),
      prisma.pomodoroSession.findMany({
        where: { userId: user.id },
        select: { durationMinutes: true, type: true, completedAt: true },
      }),
      prisma.flashcard.count({
        where: { userId: user.id },
      }),
      prisma.document.count({
        where: { userId: user.id },
      }),
      prisma.document.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff).getTime();

    let studyToday = 0;
    let studyWeek = 0;

    for (const s of pomodoroData) {
      if (s.type === 'study') {
        const t = s.completedAt.getTime();
        if (t >= startOfToday) {
          studyToday += s.durationMinutes;
        }
        if (t >= startOfWeek) {
          studyWeek += s.durationMinutes;
        }
      }
    }

    return apiSuccess({
      profile: profile
        ? {
            id: profile.id,
            email: user.email,
            full_name: profile.fullName,
            academic_level: profile.academicLevel,
            field_of_study: profile.fieldOfStudy,
            academic_goals: profile.academicGoals,
            avatar_url: profile.avatarUrl,
            onboarding_completed: profile.onboardingCompleted,
          }
        : null,
      study_minutes_today: studyToday,
      study_minutes_week: studyWeek,
      today_schedule: todaySchedule.map((c) => ({
        id: c.id,
        subject_name: c.subjectName,
        day_of_week: c.dayOfWeek,
        start_time: c.startTime,
        end_time: c.endTime,
        room: c.room,
        professor: c.professor,
        color: c.color,
      })),
      today_revision_slots: todaySlots.map((s) => ({
        id: s.id,
        plan_id: s.planId,
        subject_name: s.subjectName,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime,
        end_time: s.endTime,
        focus_topic: s.focusTopic,
        priority: s.priority,
        status: s.status,
      })),
      pending_flashcards_count: flashcardsCount,
      total_documents_count: totalDocsCount,
      recent_documents: recentDocs.map((d) => ({
        id: d.id,
        title: d.title,
        file_url: d.fileUrl,
        file_type: d.fileType,
        summary: d.summary,
        created_at: d.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Erreur GET /api/dashboard/stats :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
