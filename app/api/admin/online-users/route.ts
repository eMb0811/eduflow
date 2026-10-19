import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/db/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/online-users
 * Accès réservé EXCLUSIVEMENT au Super Utilisateur.
 * Retourne la liste des utilisateurs connectés en temps réel et leurs statuts.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    // Contrôle strict : SEUL le Super Utilisateur a accès à la supervision en ligne
    if (user.role !== 'superadmin') {
      return apiError(
        'Accès refusé. La vue des utilisateurs en ligne est réservée exclusivement au Super Utilisateur.',
        403
      );
    }

    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // 1. Récupération des utilisateurs récents (dernière activité il y a moins de 24h ou en ligne)
    const recentUsers = await prisma.user.findMany({
      where: {
        lastActiveAt: {
          not: null,
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Dernières 24h
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        lastActiveAt: true,
        lastActivePath: true,
        profile: {
          select: {
            fullName: true,
            academicLevel: true,
            fieldOfStudy: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
      take: 50,
    });

    // 2. Calcul des métriques globales
    const totalUsers = await prisma.user.count();
    const onlineCount = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: twoMinutesAgo,
        },
      },
    });

    const idleCount = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: tenMinutesAgo,
          lt: twoMinutesAgo,
        },
      },
    });

    // Formatage des utilisateurs avec calcul de statut dynamique
    const formattedUsers = recentUsers.map((u) => {
      const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : null;
      let status: 'online' | 'idle' | 'offline' = 'offline';
      let secondsAgo = 999999;

      if (lastActive) {
        secondsAgo = Math.max(0, Math.floor((now.getTime() - lastActive.getTime()) / 1000));
        if (secondsAgo <= 120) {
          status = 'online';
        } else if (secondsAgo <= 600) {
          status = 'idle';
        } else {
          status = 'offline';
        }
      }

      return {
        id: u.id,
        email: u.email,
        role: u.role,
        fullName: u.profile?.fullName || u.email.split('@')[0],
        academicLevel: u.profile?.academicLevel || 'Non renseigné',
        fieldOfStudy: u.profile?.fieldOfStudy || 'Général',
        avatarUrl: u.profile?.avatarUrl,
        lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
        lastActivePath: u.lastActivePath || '/dashboard',
        status,
        secondsAgo,
      };
    });

    return apiSuccess({
      users: formattedUsers,
      stats: {
        totalUsers,
        onlineCount,
        idleCount,
        offlineCount: Math.max(0, totalUsers - (onlineCount + idleCount)),
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Erreur GET /api/admin/online-users :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur lors de la récupération des utilisateurs en ligne',
      500
    );
  }
}
