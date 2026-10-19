import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { loginSchema } from '@/lib/validations/auth';
import { comparePassword, createAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth/jwt';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return apiError('Identifiants invalides', 400, {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Recherche de l'utilisateur avec son profil
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (!user) {
      return apiError('Adresse email ou mot de passe incorrect', 401);
    }

    // Vérification du mot de passe
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return apiError('Adresse email ou mot de passe incorrect', 401);
    }

    // Génération du token JWT
    const token = await createAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      profile: user.profile,
    });

    const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

    // Écriture du cookie de session HTTP-Only sécurisé
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    return response;
  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne lors de la connexion',
      500
    );
  }
}
