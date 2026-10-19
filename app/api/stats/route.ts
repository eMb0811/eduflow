import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stats
 * Calcule les statistiques d'étude globales (streak, volume d'heures, progression hebdomadaire) depuis MySQL
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const sessions = await prisma.pomodoroSession.findMany({
      where: { userId: user.id },
      select: { durationMinutes: true, type: true, completedAt: true },
    });

    let totalMinutes = 0;
    let totalSessions = 0;
    const daysSet = new Set<string>();

    for (const s of sessions) {
      if (s.type === 'study') {
        totalMinutes += s.durationMinutes;
        totalSessions += 1;
        const dateStr = s.completedAt.toISOString().split('T')[0];
        daysSet.add(dateStr);
      }
    }

    // Calcul de la série consécutive (streak)
    let streakDays = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      if (daysSet.has(str)) {
        streakDays += 1;
      } else if (i > 0) {
        break;
      }
    }

    const subjects = await prisma.subject.findMany({
      where: { userId: user.id },
      select: { name: true },
    });

    const subjectsStudied = subjects.map((s) => s.name);

    // Progression hebdomadaire (objectif 20h / 1200 minutes)
    const weeklyTarget = 1200;
    const weeklyGoalProgress = Math.min(100, Math.round((totalMinutes / weeklyTarget) * 100));

    return apiSuccess({
      total_study_minutes: totalMinutes,
      total_sessions: totalSessions,
      streak_days: streakDays,
      subjects_studied: subjectsStudied,
      weekly_goal_progress: weeklyGoalProgress,
    });
  } catch (error) {
    console.error('Erreur GET /api/stats :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
