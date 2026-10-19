import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { updateScheduleEntrySchema } from '@/lib/validations/schedule';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

/**
 * DELETE /api/schedule/[id]
 * Supprime un cours de l'emploi du temps de l'étudiant dans MySQL
 */
export async function DELETE(
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
      return apiError('ID requis', 400);
    }

    const existing = await prisma.scheduleEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return apiError('Cours introuvable', 404);
    }

    await prisma.scheduleEntry.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true, id });
  } catch (error) {
    console.error('Erreur DELETE /api/schedule/[id] :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * PATCH /api/schedule/[id]
 * Modifie un cours de l'emploi du temps dans MySQL
 */
export async function PATCH(
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
      return apiError('ID requis', 400);
    }

    const body = await request.json();
    const validationResult = updateScheduleEntrySchema.safeParse(body);

    if (!validationResult.success) {
      return apiError('Données de modification invalides', 400, {
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const existing = await prisma.scheduleEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return apiError('Cours introuvable', 404);
    }

    const data = validationResult.data;

    const updated = await prisma.scheduleEntry.update({
      where: { id },
      data: {
        ...(data.subject_name && { subjectName: data.subject_name }),
        ...(data.day_of_week && { dayOfWeek: data.day_of_week }),
        ...(data.start_time && { startTime: data.start_time }),
        ...(data.end_time && { endTime: data.end_time }),
        ...(data.room !== undefined && { room: data.room || null }),
        ...(data.professor !== undefined && { professor: data.professor || null }),
        ...(data.color && { color: data.color }),
      },
    });

    return apiSuccess({
      id: updated.id,
      user_id: updated.userId,
      subject_id: updated.subjectId,
      subject_name: updated.subjectName,
      day_of_week: updated.dayOfWeek,
      start_time: updated.startTime,
      end_time: updated.endTime,
      room: updated.room,
      professor: updated.professor,
      color: updated.color,
      recurrence: updated.recurrence,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Erreur PATCH /api/schedule/[id] :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
