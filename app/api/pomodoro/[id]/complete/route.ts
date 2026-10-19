import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

/**
 * PUT /api/pomodoro/[id]/complete
 * Marque une session Pomodoro comme terminée dans MySQL
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const { id } = params;
    if (!id) {
      return apiError('ID de session requis', 400);
    }

    const existing = await prisma.pomodoroSession.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return apiError('Session introuvable', 404);
    }

    const updated = await prisma.pomodoroSession.update({
      where: { id },
      data: {
        completedAt: new Date(),
      },
    });

    return apiSuccess({
      id: updated.id,
      user_id: updated.userId,
      subject_id: updated.subjectId,
      duration_minutes: updated.durationMinutes,
      type: updated.type,
      notes: updated.notes,
      completed_at: updated.completedAt.toISOString(),
      created_at: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Erreur PUT /api/pomodoro/[id]/complete :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
