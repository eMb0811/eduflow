import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { createPomodoroSchema } from '@/lib/validations/pomodoro';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pomodoro
 * Calcule les statistiques d'étude et liste les sessions récentes depuis MySQL
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const allSessions = await prisma.pomodoroSession.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: 'desc' },
      include: { subject: true },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff).getTime();

    let totalMinutesToday = 0;
    let totalMinutesWeek = 0;
    let countToday = 0;
    let countWeek = 0;

    for (const s of allSessions) {
      if (s.type === 'study') {
        const sessionTime = new Date(s.completedAt).getTime();
        if (sessionTime >= startOfToday) {
          totalMinutesToday += s.durationMinutes;
          countToday += 1;
        }
        if (sessionTime >= startOfWeek) {
          totalMinutesWeek += s.durationMinutes;
          countWeek += 1;
        }
      }
    }

    return apiSuccess({
      total_study_minutes_today: totalMinutesToday,
      total_study_minutes_week: totalMinutesWeek,
      completed_sessions_today: countToday,
      completed_sessions_week: countWeek,
      sessions: allSessions.slice(0, 50).map((s) => ({
        id: s.id,
        user_id: s.userId,
        subject_id: s.subjectId,
        subject_name: s.subject?.name,
        duration_minutes: s.durationMinutes,
        type: s.type,
        notes: s.notes,
        completed_at: s.completedAt.toISOString(),
        created_at: s.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Erreur GET /api/pomodoro :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * POST /api/pomodoro
 * Enregistre une nouvelle session Pomodoro d'étude ou de pause dans MySQL
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json();
    const validationResult = createPomodoroSchema.safeParse(body);

    if (!validationResult.success) {
      return apiError('Données de session Pomodoro invalides', 400, {
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { duration_minutes, type, subject_id, notes, completed_at } = validationResult.data;

    const newSession = await prisma.pomodoroSession.create({
      data: {
        userId: user.id,
        durationMinutes: duration_minutes,
        type,
        subjectId: subject_id || null,
        notes: notes || null,
        completedAt: completed_at ? new Date(completed_at) : new Date(),
      },
      include: {
        subject: true,
      },
    });

    return apiSuccess(
      {
        id: newSession.id,
        user_id: newSession.userId,
        subject_id: newSession.subjectId,
        subject_name: newSession.subject?.name,
        duration_minutes: newSession.durationMinutes,
        type: newSession.type,
        notes: newSession.notes,
        completed_at: newSession.completedAt.toISOString(),
        created_at: newSession.createdAt.toISOString(),
      },
      201
    );
  } catch (error) {
    console.error('Erreur POST /api/pomodoro :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
