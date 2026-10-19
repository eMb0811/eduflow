import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/db/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { adminUpdateUserSchema } from '@/lib/validations/admin';
import { hashPassword } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/users/[id]
 * Récupère le profil complet et l'activité d'un utilisateur spécifique
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    if (user.role !== 'superadmin') {
      return apiError('Accès refusé. Seul le Super Utilisateur est administrateur du site.', 403);
    }

    const { id } = params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        documents: {
          select: {
            id: true,
            title: true,
            fileType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        quizzes: {
          select: {
            id: true,
            title: true,
            bestScore: true,
            totalQuestions: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        scheduleEntries: {
          select: {
            id: true,
            subjectName: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            room: true,
          },
          take: 10,
        },
        _count: {
          select: {
            documents: true,
            flashcards: true,
            quizzes: true,
            scheduleEntries: true,
            pomodoroSessions: true,
            chatSessions: true,
          },
        },
      },
    });

    if (!targetUser) {
      return apiError('Utilisateur introuvable', 404);
    }

    return apiSuccess({
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      lastActiveAt: targetUser.lastActiveAt ? targetUser.lastActiveAt.toISOString() : null,
      lastActivePath: targetUser.lastActivePath || null,
      createdAt: targetUser.createdAt.toISOString(),
      updatedAt: targetUser.updatedAt.toISOString(),
      profile: targetUser.profile,
      documents: targetUser.documents,
      quizzes: targetUser.quizzes,
      scheduleEntries: targetUser.scheduleEntries,
      counts: targetUser._count,
    });
  } catch (error) {
    console.error('Erreur GET /api/admin/users/[id] :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Modifie le rôle, le profil ou réinitialise le mot de passe d'un utilisateur
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    if (user.role !== 'superadmin') {
      return apiError('Accès refusé. Seul le Super Utilisateur est administrateur du site.', 403);
    }

    const { id } = params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!targetUser) {
      return apiError('Utilisateur introuvable', 404);
    }

    // Protection : Seul le Super Utilisateur peut modifier son propre compte
    if (targetUser.role === 'superadmin' && user.id !== targetUser.id) {
      return apiError(
        'Le compte Super Utilisateur est protégé. Seul le Super Utilisateur peut le modifier.',
        403
      );
    }

    const body = await request.json();
    const validation = adminUpdateUserSchema.safeParse(body);

    if (!validation.success) {
      return apiError('Paramètres de mise à jour invalides', 400, {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { role, fullName, academicLevel, fieldOfStudy, newPassword } =
      validation.data;

    // Règle d'or : Un seul Super Utilisateur
    if (role === 'superadmin') {
      if (user.role !== 'superadmin') {
        return apiError('Seul le Super Utilisateur peut attribuer ce privilège.', 403);
      }
      const existingSuper = await prisma.user.findFirst({
        where: { role: 'superadmin', NOT: { id } },
      });
      if (existingSuper) {
        return apiError(
          'Il ne peut y avoir qu\'un seul Super Utilisateur sur la plateforme.',
          400
        );
      }
    }

    // Protection : le Super Utilisateur ne peut pas rétrograder son propre compte
    if (user.id === id && role && role !== 'superadmin') {
      return apiError(
        'Vous ne pouvez pas rétrograder le compte Super Administrateur.',
        400
      );
    }

    // Données à mettre à jour sur l'utilisateur
    const userUpdateData: { role?: string; passwordHash?: string } = {};
    if (role) {
      userUpdateData.role = role;
    }
    if (newPassword && newPassword.trim().length >= 6) {
      userUpdateData.passwordHash = await hashPassword(newPassword.trim());
    }

    // Données de profil
    const profileUpdateData: {
      fullName?: string | null;
      academicLevel?: string | null;
      fieldOfStudy?: string | null;
    } = {};

    if (fullName !== undefined) profileUpdateData.fullName = fullName;
    if (academicLevel !== undefined) profileUpdateData.academicLevel = academicLevel;
    if (fieldOfStudy !== undefined) profileUpdateData.fieldOfStudy = fieldOfStudy;

    const updatedUser = await prisma.$transaction(async (tx) => {
      let u = targetUser;
      if (Object.keys(userUpdateData).length > 0) {
        u = (await tx.user.update({
          where: { id },
          data: userUpdateData,
          include: { profile: true },
        })) as any;
      }

      if (Object.keys(profileUpdateData).length > 0) {
        if (targetUser.profile) {
          await tx.profile.update({
            where: { userId: id },
            data: profileUpdateData,
          });
        } else {
          await tx.profile.create({
            data: {
              userId: id,
              email: targetUser.email,
              fullName: fullName || targetUser.email.split('@')[0],
              academicLevel: academicLevel || 'Licence 1',
              fieldOfStudy: fieldOfStudy || 'Général',
              onboardingCompleted: true,
            },
          });
        }
      }

      return tx.user.findUnique({
        where: { id },
        include: { profile: true },
      });
    });

    return apiSuccess({
      message: 'Utilisateur mis à jour avec succès',
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        role: updatedUser?.role,
        profile: updatedUser?.profile,
      },
    });
  } catch (error) {
    console.error('Erreur PATCH /api/admin/users/[id] :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne lors de la mise à jour',
      500
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Supprime définitivement un compte utilisateur et toutes ses données associées
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    if (user.role !== 'superadmin') {
      return apiError('Accès refusé. Seul le Super Utilisateur est administrateur du site.', 403);
    }

    const { id } = params;

    // Protection : un administrateur ne peut pas supprimer son propre compte
    if (user.id === id) {
      return apiError(
        'Vous ne pouvez pas supprimer votre propre compte.',
        400
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return apiError('Utilisateur introuvable', 404);
    }

    // Protection inviolable : Le Super Utilisateur ne peut être supprimé
    if (targetUser.role === 'superadmin') {
      return apiError(
        'Le compte Super Utilisateur est protégé par le système et ne peut être supprimé.',
        403
      );
    }

    // Suppression en cascade via Prisma
    await prisma.user.delete({
      where: { id },
    });

    return apiSuccess({
      message: `Le compte utilisateur ${targetUser.email} a été supprimé avec succès.`,
      deleted_id: id,
    });
  } catch (error) {
    console.error('Erreur DELETE /api/admin/users/[id] :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur lors de la suppression',
      500
    );
  }
}
