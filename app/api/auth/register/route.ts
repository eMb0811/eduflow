import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { registerSchema } from '@/lib/validations/auth';
import { hashPassword, createAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth/jwt';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return apiError('Données d\'inscription invalides', 400, {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password, fullName } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Vérifier l'unicité de l'email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return apiError('Un compte existe déjà avec cette adresse email', 409);
    }

    // Hachage sécurisé du mot de passe
    const passwordHash = await hashPassword(password);

    // Création transactionnelle de l'utilisateur et de son profil
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: 'student',
        profile: {
          create: {
            email: normalizedEmail,
            fullName: fullName.trim(),
            onboardingCompleted: false,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Génération du token de session JWT
    const token = await createAuthToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    const response = apiSuccess(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
        profile: newUser.profile,
      },
      201
    );

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
    console.error('Erreur lors de l\'inscription :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne lors de la création du compte',
      500
    );
  }
}
