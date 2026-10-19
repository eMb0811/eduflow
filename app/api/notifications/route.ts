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

const KOCC_MAXIMS = [
  {
    title: "Sagesse de Kocc Barma",
    message: "« Le savoir est l'eau qui vivifie l'esprit. Chaque heure de révision méthodique consolide votre avenir. »",
  },
  {
    title: "Conseil de méthode de Kocc",
    message: "« Mieux vaut une heure de concentration pure que trois heures d'hésitation. Activez un Pomodoro dès que vous commencez. »",
  },
  {
    title: "Patience et persévérance",
    message: "« L'arbre de la connaissance prend racine dans la répétition et fleurit dans la compréhension. »",
  },
  {
    title: "Discerner l'essentiel",
    message: "« Ne cherchez pas à tout retenir d'un coup : commencez par les théorèmes fondamentaux et les concepts clés. »",
  },
];

/**
 * GET /api/notifications
 * Renvoie les notifications intelligentes en temps réel pour l'étudiant connecté
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const currentDay = getCurrentDayOfWeek();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Prochains cours d'aujourd'hui
    const todayCourses = await prisma.scheduleEntry.findMany({
      where: {
        userId: user.id,
        dayOfWeek: currentDay,
      },
      orderBy: { startTime: 'asc' },
    });

    // 2. Créneaux de révision du planning d'aujourd'hui
    const activePlan = await prisma.revisionPlan.findFirst({
      where: { userId: user.id, isActive: true },
      include: {
        slots: {
          where: { dayOfWeek: currentDay },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    // 3. Sessions Pomodoro récentes
    const recentPomodoros = await prisma.pomodoroSession.findMany({
      where: {
        userId: user.id,
        completedAt: { gte: today },
      },
    });

    const notifications: Array<{
      id: string;
      title: string;
      description: string;
      type: 'course' | 'revision' | 'kocc' | 'achievement';
      href: string;
      createdAt: string;
    }> = [];

    // Notification(s) de cours
    if (todayCourses.length > 0) {
      const nextCourse = todayCourses[0];
      notifications.push({
        id: `course-${nextCourse.id}`,
        title: `Prochain cours : ${nextCourse.subjectName}`,
        description: `Créneau de ${nextCourse.startTime} à ${nextCourse.endTime}${nextCourse.room ? ` en ${nextCourse.room}` : ''}.`,
        type: 'course',
        href: '/schedule',
        createdAt: new Date().toISOString(),
      });
    }

    // Notification(s) de révision
    if (activePlan && activePlan.slots.length > 0) {
      const pendingSlot = activePlan.slots.find((s) => s.status !== 'completed') || activePlan.slots[0];
      notifications.push({
        id: `revision-${pendingSlot.id}`,
        title: `Session de révision : ${pendingSlot.subjectName}`,
        description: `${pendingSlot.focusTopic || 'Révision planifiée'} de ${pendingSlot.startTime} à ${pendingSlot.endTime}.`,
        type: 'revision',
        href: '/planning',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      });
    }

    // Notification Pomodoro si sessions complétées
    if (recentPomodoros.length > 0) {
      const totalMinutes = recentPomodoros.reduce((sum, p) => sum + p.durationMinutes, 0);
      notifications.push({
        id: `pomodoro-streak-${today.toISOString().split('T')[0]}`,
        title: 'Focus Pomodoro du jour',
        description: `Bravo ! Vous avez cumulé ${totalMinutes} minutes de travail intensif aujourd'hui.`,
        type: 'achievement',
        href: '/pomodoro',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      });
    }

    // Maxime / Conseil de Kocc Barma (sélectionné selon le jour de l'année)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const maxim = KOCC_MAXIMS[dayOfYear % KOCC_MAXIMS.length];

    notifications.push({
      id: `kocc-daily-${today.toISOString().split('T')[0]}`,
      title: maxim.title,
      description: maxim.message,
      type: 'kocc',
      href: '/chat',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    });

    return apiSuccess({
      notifications,
      total: notifications.length,
    });
  } catch (error) {
    console.error('Erreur dans /api/notifications :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne lors de la récupération des notifications',
      500
    );
  }
}
