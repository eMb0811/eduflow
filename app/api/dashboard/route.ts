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
 * GET /api/dashboard
 * Données réelles consolidées pour le tableau de bord principal de l'étudiant
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const currentDay = getCurrentDayOfWeek();

    // 1. Profil académique
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    // 2. Cours d'aujourd'hui (ou prochains cours de la semaine si aucun cours aujourd'hui)
    let classes = await prisma.scheduleEntry.findMany({
      where: {
        userId: user.id,
        dayOfWeek: currentDay,
      },
      orderBy: { startTime: 'asc' },
    });

    if (classes.length === 0) {
      classes = await prisma.scheduleEntry.findMany({
        where: { userId: user.id },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        take: 4,
      });
    }

    // 3. Créneaux de révision du jour (ou prochains créneaux de la semaine si dimanche)
    let studyBlocks = await prisma.revisionSlot.findMany({
      where: {
        userId: user.id,
        dayOfWeek: currentDay,
      },
      orderBy: { startTime: 'asc' },
    });

    if (studyBlocks.length === 0) {
      studyBlocks = await prisma.revisionSlot.findMany({
        where: { userId: user.id },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        take: 4,
      });
    }

    // 4. Statistiques réelles depuis Pomodoro
    const sessions = await prisma.pomodoroSession.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: 'desc' },
    });

    let totalMinutes = 0;
    let totalSessions = 0;
    const studyDays = new Set<string>();

    for (const s of sessions) {
      if (s.type === 'study') {
        totalMinutes += s.durationMinutes;
        totalSessions += 1;
        studyDays.add(s.completedAt.toISOString().split('T')[0]);
      }
    }

    // Calcul de la série active (streak)
    const streakDays = studyDays.size > 0 ? studyDays.size : 0;

    // 5. Documents récents
    const recentDocs = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const dashboardData = {
      profile: {
        id: profile?.id || user.id,
        email: user.email,
        full_name: profile?.fullName || user.email.split('@')[0] || 'Étudiant',
        academic_level: profile?.academicLevel || null,
        field_of_study: profile?.fieldOfStudy || null,
        academic_goals: profile?.academicGoals || null,
        avatar_url: profile?.avatarUrl || null,
        onboarding_completed: profile?.onboardingCompleted || false,
        created_at: profile?.createdAt?.toISOString() || new Date().toISOString(),
        updated_at: profile?.updatedAt?.toISOString() || new Date().toISOString(),
      },
      upcoming_classes: classes.map((c) => ({
        id: c.id,
        subject_name: c.subjectName,
        day_of_week: c.dayOfWeek,
        start_time: c.startTime,
        end_time: c.endTime,
        room: c.room,
        professor: c.professor,
        color: c.color,
      })),
      today_study_blocks: studyBlocks.map((s) => ({
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
      stats: {
        total_study_minutes: totalMinutes,
        total_sessions: totalSessions,
        streak_days: streakDays,
        weekly_goal_progress: Math.min(100, Math.round((totalMinutes / 1200) * 100)), // Base 20h/semaine
      },
      recent_documents: recentDocs.map((d) => ({
        id: d.id,
        title: d.title,
        file_url: d.fileUrl,
        file_type: d.fileType,
        summary: d.summary,
        created_at: d.createdAt.toISOString(),
      })),
    };

    return apiSuccess(dashboardData);
  } catch (error) {
    console.error('Erreur GET /api/dashboard :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
