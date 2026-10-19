import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { generatePlanningSchema } from '@/lib/validations/planning';
import { apiSuccess, apiError } from '@/lib/api/response';
import { GeneratePlanningResponseData } from '@/types/api';
import { syncPlanningWithSchedule } from '@/lib/schedule/auto-planner';

/**
 * POST /api/schedule/generate-planning
 * Génère et synchronise automatiquement le planning de révision en fonction
 * des cours de l'Emploi du Temps et des scores de maîtrise dans Mes Cours
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = generatePlanningSchema.safeParse(body);

    const targetHoursPerDay = validationResult.success
      ? validationResult.data.target_hours_per_day ?? 4
      : 4;

    const syncedPlan = await syncPlanningWithSchedule(user.id, {
      targetHoursPerDay,
      forceRebuild: true,
    });

    const slots = (syncedPlan.slots || []).map((s) => ({
      subject_name: s.subjectName,
      day_of_week: s.dayOfWeek as any,
      start_time: s.startTime,
      end_time: s.endTime,
      focus_topic: s.focusTopic || `Révision : ${s.subjectName}`,
      priority: (s.priority as 'low' | 'medium' | 'high') || 'medium',
    }));

    const responsePayload: GeneratePlanningResponseData = {
      plan_id: syncedPlan.id,
      title: syncedPlan.title,
      total_slots: slots.length,
      total_hours: Math.round(slots.length * 1.5),
      slots,
    };

    return apiSuccess<GeneratePlanningResponseData>(responsePayload);
  } catch (error) {
    console.error('Erreur POST /api/schedule/generate-planning :', error);
    return apiError(
      error instanceof Error
        ? error.message
        : 'Erreur lors de la synchronisation du planning de révision',
      500
    );
  }
}
