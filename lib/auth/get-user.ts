import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth/jwt';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Résolveur d'authentification robuste pour les Route Handlers Next.js
 * Compatible avec :
 * 1. Cookie HTTP-only `eduflow_session`
 * 2. Header `Authorization: Bearer <token>`
 */
export async function getAuthenticatedUser(request?: NextRequest): Promise<{
  user: AuthUser | null;
  profile?: any | null;
  error?: string;
}> {
  try {
    let token: string | undefined;

    // 1. Vérifier dans la requête si passée
    if (request) {
      // Vérifier le header Authorization
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }

      // Vérifier dans les cookies de la requête
      if (!token) {
        token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
      }
    }

    // 2. Fallback sur cookies() de next/headers
    if (!token) {
      try {
        const cookieStore = cookies();
        token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
      } catch {
        // En dehors d'un contexte de rendu React Server
      }
    }

    if (!token) {
      return { user: null, error: 'Non authentifié' };
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return { user: null, error: 'Session invalide ou expirée' };
    }

    // Récupérer l'utilisateur et son profil depuis MySQL
    const userWithProfile = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { profile: true },
    });

    if (!userWithProfile) {
      return { user: null, error: 'Utilisateur introuvable' };
    }

    return {
      user: {
        id: userWithProfile.id,
        email: userWithProfile.email,
        role: userWithProfile.role,
      },
      profile: userWithProfile.profile,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Erreur d\'authentification',
    };
  }
}
