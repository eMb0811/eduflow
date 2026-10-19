import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/db/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/heartbeat
 * Signale l'activité en temps réel d'un utilisateur connecté
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError('Non authentifié', 401);
    }

    const body = await request.json().catch(() => ({}));
    const rawPath = typeof body?.path === 'string' ? body.path.trim().slice(0, 120) : null;

    // Mise à jour de la dernière présence et de la page active
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastActiveAt: new Date(),
        ...(rawPath ? { lastActivePath: rawPath } : {}),
      },
    });

    return apiSuccess({
      ok: true,
      lastActiveAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur POST /api/user/heartbeat :', error);
    return apiError('Erreur de signalement de présence', 500);
  }
}
