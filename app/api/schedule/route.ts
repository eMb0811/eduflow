import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { saveScheduleEntriesSchema, scheduleItemSchema } from '@/lib/validations/schedule';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import {
  ensureDefaultScheduleEntries,
  syncPlanningWithSchedule,
} from '@/lib/schedule/auto-planner';

export const dynamic = 'force-dynamic';

/**
 * GET /api/schedule
 * Récupère tous les cours de l'emploi du temps de l'étudiant depuis MySQL
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const entries = await ensureDefaultScheduleEntries(user.id);

    return apiSuccess(
      entries.map((e) => ({
        id: e.id,
        user_id: e.userId,
        subject_id: e.subjectId,
        subject_name: e.subjectName,
        day_of_week: e.dayOfWeek,
        start_time: e.startTime,
        end_time: e.endTime,
        room: e.room,
        professor: e.professor,
        color: e.color,
        recurrence: e.recurrence,
        created_at: e.createdAt.toISOString(),
        updated_at: e.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Erreur GET /api/schedule :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * POST /api/schedule
 * Enregistre un cours ou un lot de cours dans MySQL et synchronise automatiquement le Planning de révision
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json();

    let entriesToInsert: Array<{
      subject_name: string;
      day_of_week: string;
      start_time: string;
      end_time: string;
      room?: string | null;
      professor?: string | null;
      color?: string;
    }> = [];

    let replaceExisting = false;

    if (body && Array.isArray(body.entries)) {
      const batchValidation = saveScheduleEntriesSchema.safeParse(body);
      if (!batchValidation.success) {
        return apiError('Format de cours invalide', 400, {
          errors: batchValidation.error.flatten().fieldErrors,
        });
      }
      entriesToInsert = batchValidation.data.entries;
      replaceExisting = batchValidation.data.replace_existing;
    } else {
      const singleValidation = scheduleItemSchema.safeParse(body);
      if (!singleValidation.success) {
        return apiError('Format de cours invalide', 400, {
          errors: singleValidation.error.flatten().fieldErrors,
        });
      }
      entriesToInsert = [singleValidation.data];
    }

    if (replaceExisting) {
      await prisma.scheduleEntry.deleteMany({
        where: { userId: user.id },
      });
    }

    const created = await prisma.$transaction(
      entriesToInsert.map((entry) =>
        prisma.scheduleEntry.create({
          data: {
            userId: user.id,
            subjectName: entry.subject_name,
            dayOfWeek: entry.day_of_week,
            startTime: entry.start_time,
            endTime: entry.end_time,
            room: entry.room || null,
            professor: entry.professor || null,
            color: entry.color || '#3B82F6',
            recurrence: 'weekly',
          },
        })
      )
    );

    // Synchroniser automatiquement le Planning de Révision avec le nouvel emploi du temps
    await syncPlanningWithSchedule(user.id, { forceRebuild: true });

    return apiSuccess(
      created.map((e) => ({
        id: e.id,
        user_id: e.userId,
        subject_id: e.subjectId,
        subject_name: e.subjectName,
        day_of_week: e.dayOfWeek,
        start_time: e.startTime,
        end_time: e.endTime,
        room: e.room,
        professor: e.professor,
        color: e.color,
        recurrence: e.recurrence,
        created_at: e.createdAt.toISOString(),
        updated_at: e.updatedAt.toISOString(),
      })),
      201
    );
  } catch (error) {
    console.error('Erreur POST /api/schedule :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
