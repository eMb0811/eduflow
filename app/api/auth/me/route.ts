import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth/jwt';
import { apiError, apiSuccess } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Recherche du token dans les cookies
    let token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    // 2. Recherche alternative dans l'en-tête Authorization
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      return apiSuccess({
        authenticated: false,
        user: null,
        profile: null,
      });
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return apiSuccess({
        authenticated: false,
        user: null,
        profile: null,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,
      },
    });

    if (!user) {
      return apiSuccess({
        authenticated: false,
        user: null,
        profile: null,
      });
    }

    return apiSuccess({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      profile: user.profile,
    });
  } catch (error) {
    console.error('Erreur dans /api/auth/me :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne',
      500
    );
  }
}
