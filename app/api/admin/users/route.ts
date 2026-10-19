import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/db/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { adminCreateUserSchema } from '@/lib/validations/admin';
import { hashPassword } from '@/lib/auth/jwt';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * Récupère la liste paginée et filtrable de tous les utilisateurs pour l'administration
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    if (user.role !== 'superadmin') {
      return apiError('Accès refusé. Seul le Super Utilisateur est administrateur du site.', 403);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const roleFilter = searchParams.get('role')?.trim() || '';
    const levelFilter = searchParams.get('level')?.trim() || '';
    const sortBy = searchParams.get('sortBy')?.trim() || 'createdAt';
    const sortOrder = searchParams.get('sortOrder')?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Conditions de filtrage
    const whereClause: Prisma.UserWhereInput = {};

    if (roleFilter && roleFilter !== 'all') {
      whereClause.role = roleFilter;
    }

    if (search) {
      whereClause.OR = [
        { email: { contains: search } },
        { profile: { is: { fullName: { contains: search } } } },
        { profile: { is: { fieldOfStudy: { contains: search } } } },
      ];
    }

    if (levelFilter && levelFilter !== 'all') {
      whereClause.profile = {
        is: {
          academicLevel: levelFilter,
        },
      };
    }

    // Gestion du tri
    let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: sortOrder };
    if (sortBy === 'email') {
      orderBy = { email: sortOrder };
    } else if (sortBy === 'role') {
      orderBy = { role: sortOrder };
    } else if (sortBy === 'fullName') {
      orderBy = { profile: { fullName: sortOrder } };
    }

    // Requête principale avec comptages relationnels
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          role: true,
          lastActiveAt: true,
          lastActivePath: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              id: true,
              fullName: true,
              academicLevel: true,
              fieldOfStudy: true,
              avatarUrl: true,
              onboardingCompleted: true,
            },
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
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    // Statistiques globales de la plateforme
    const [totalUsers, totalAdmins, totalSuperAdmins, totalStudents, totalDocuments, totalQuizzes, totalPomodoro] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'admin' } }),
        prisma.user.count({ where: { role: 'superadmin' } }),
        prisma.user.count({ where: { role: 'student' } }),
        prisma.document.count(),
        prisma.quiz.count(),
        prisma.pomodoroSession.count(),
      ]);

    return apiSuccess({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
        lastActivePath: u.lastActivePath || null,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        profile: u.profile,
        counts: {
          documents: u._count.documents,
          flashcards: u._count.flashcards,
          quizzes: u._count.quizzes,
          scheduleEntries: u._count.scheduleEntries,
          pomodoroSessions: u._count.pomodoroSessions,
          chatSessions: u._count.chatSessions,
        },
      })),
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      stats: {
        totalUsers,
        totalAdmins,
        totalSuperAdmins,
        totalStudents,
        totalDocuments,
        totalQuizzes,
        totalPomodoro,
      },
    });
  } catch (error) {
    console.error('Erreur GET /api/admin/users :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * POST /api/admin/users
 * Création manuelle d'un compte utilisateur par un administrateur
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    if (user.role !== 'superadmin') {
      return apiError('Accès refusé. Seul le Super Utilisateur est administrateur du site.', 403);
    }

    const body = await request.json();
    const validation = adminCreateUserSchema.safeParse(body);

    if (!validation.success) {
      return apiError('Données utilisateur invalides', 400, {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password, role, fullName, academicLevel, fieldOfStudy } =
      validation.data;

    // Règle d'or : Un seul Super Utilisateur sur toute la plateforme
    if (role === 'superadmin') {
      if (user.role !== 'superadmin') {
        return apiError('Seul le Super Utilisateur peut accorder ce privilège.', 403);
      }
      const existingSuper = await prisma.user.findFirst({
        where: { role: 'superadmin' },
      });
      if (existingSuper) {
        return apiError(
          'Il ne peut y avoir qu\'un seul Super Utilisateur sur la plateforme.',
          400
        );
      }
    }

    // Vérifier si l'email existe déjà
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return apiError('Un utilisateur avec cette adresse email existe déjà.', 409);
    }

    const passwordHash = await hashPassword(password);

    // Création transactionnelle de l'utilisateur et de son profil
    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
        },
      });

      const createdProfile = await tx.profile.create({
        data: {
          userId: createdUser.id,
          email: createdUser.email,
          fullName: fullName || email.split('@')[0],
          academicLevel: academicLevel || 'Licence 1',
          fieldOfStudy: fieldOfStudy || 'Général',
          onboardingCompleted: true,
        },
      });

      return {
        ...createdUser,
        profile: createdProfile,
      };
    });

    return apiSuccess(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt.toISOString(),
        profile: {
          fullName: newUser.profile.fullName,
          academicLevel: newUser.profile.academicLevel,
          fieldOfStudy: newUser.profile.fieldOfStudy,
        },
      },
      201
    );
  } catch (error) {
    console.error('Erreur POST /api/admin/users :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne lors de la création',
      500
    );
  }
}
