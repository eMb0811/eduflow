import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { updateProfileSchema } from '@/lib/validations/profile';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile
 * Retrieves the authenticated user's academic profile from MySQL
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    let profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      // Auto-création du profil si manquant
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          email: user.email,
          onboardingCompleted: false,
        },
      });
    }

    return apiSuccess(profile);
  } catch (error) {
    console.error('Erreur GET /api/profile :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * PUT /api/profile
 * Updates the authenticated user's academic profile in MySQL
 */
export async function PUT(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return apiError('Données de profil invalides', 400, {
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const data = validationResult.data;

    // Normaliser academic_goals en texte/JSON string
    const academicGoals =
      data.academic_goals !== undefined
        ? typeof data.academic_goals === 'string'
          ? data.academic_goals
          : JSON.stringify(data.academic_goals)
        : undefined;

    const updatedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        ...(data.full_name !== undefined && { fullName: data.full_name }),
        ...(data.academic_level !== undefined && { academicLevel: data.academic_level }),
        ...(data.field_of_study !== undefined && { fieldOfStudy: data.field_of_study }),
        ...(academicGoals !== undefined && { academicGoals }),
        ...(data.avatar_url !== undefined && { avatarUrl: data.avatar_url || null }),
        ...(data.onboarding_completed !== undefined && { onboardingCompleted: data.onboarding_completed }),
      },
      create: {
        userId: user.id,
        email: user.email,
        fullName: data.full_name,
        academicLevel: data.academic_level,
        fieldOfStudy: data.field_of_study,
        academicGoals,
        avatarUrl: data.avatar_url || null,
        onboardingCompleted: data.onboarding_completed ?? false,
      },
    });

    return apiSuccess(updatedProfile);
  } catch (error) {
    console.error('Erreur PUT /api/profile :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
