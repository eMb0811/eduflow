import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import {
  ensureDefaultScheduleEntries,
  syncPlanningWithSchedule,
} from '@/lib/schedule/auto-planner';

export const dynamic = 'force-dynamic';

/**
 * GET /api/schedule/planning
 * Récupère et synchronise automatiquement le planning de révision actif
 * avec les cours de l'Emploi du Temps (ScheduleEntry) depuis MySQL
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const scheduleEntries = await ensureDefaultScheduleEntries(user.id);
    const activePlan = await syncPlanningWithSchedule(user.id);

    return apiSuccess({
      plan: {
        id: activePlan.id,
        user_id: activePlan.userId,
        title: activePlan.title,
        week_start_date: activePlan.weekStartDate
          ? activePlan.weekStartDate.toISOString().split('T')[0]
          : null,
        is_active: activePlan.isActive,
        created_at: activePlan.createdAt.toISOString(),
        updated_at: activePlan.updatedAt.toISOString(),
      },
      schedule_entries: scheduleEntries.map((c) => ({
        id: c.id,
        subject_name: c.subjectName,
        day_of_week: c.dayOfWeek,
        start_time: c.startTime,
        end_time: c.endTime,
        room: c.room,
        professor: c.professor,
        color: c.color,
      })),
      slots: activePlan.slots.map((s) => ({
        id: s.id,
        plan_id: s.planId,
        user_id: s.userId,
        subject_name: s.subjectName,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime,
        end_time: s.endTime,
        focus_topic: s.focusTopic,
        priority: s.priority,
        status: s.status,
        created_at: s.createdAt.toISOString(),
        updated_at: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Erreur GET /api/schedule/planning :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * PATCH /api/schedule/planning
 * Permet de mettre à jour le statut d'un créneau de révision (pending <-> completed)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json();
    const { slot_id, status } = body;

    if (!slot_id || !status) {
      return apiError('slot_id et status sont requis', 400);
    }

    const slot = await prisma.revisionSlot.findFirst({
      where: { id: slot_id, userId: user.id },
    });

    if (!slot) {
      return apiError('Créneau introuvable', 404);
    }

    const updated = await prisma.revisionSlot.update({
      where: { id: slot_id },
      data: { status },
    });

    return apiSuccess({
      id: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error('Erreur PATCH /api/schedule/planning :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
