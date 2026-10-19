import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs/promises';

/**
 * GET /api/documents/[id]
 * Récupère un document spécifique avec ses flashcards et quiz associés depuis MySQL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const { id } = params;

    const document = await prisma.document.findFirst({
      where: { id, userId: user.id },
      include: {
        flashcards: true,
        quizzes: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!document) {
      return apiError('Document non trouvé', 404);
    }

    return apiSuccess({
      id: document.id,
      user_id: document.userId,
      subject_id: document.subjectId,
      title: document.title,
      file_url: document.fileUrl,
      file_path: document.filePath,
      file_type: document.fileType,
      file_size: document.fileSize ? Number(document.fileSize) : null,
      extracted_text: document.extractedText,
      summary: document.summary,
      key_concepts: document.keyConcepts ? JSON.parse(document.keyConcepts) : [],
      flashcards: document.flashcards,
      quizzes: document.quizzes.map((q) => ({
        ...q,
        questions: q.questions.map((quest) => ({
          ...quest,
          options: quest.options ? JSON.parse(quest.options) : [],
        })),
      })),
      created_at: document.createdAt.toISOString(),
      updated_at: document.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Erreur GET /api/documents/[id] :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * DELETE /api/documents/[id]
 * Supprime le document, ses flashcards/quiz associés en cascade et le fichier physique
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const { id } = params;

    const doc = await prisma.document.findFirst({
      where: { id, userId: user.id },
    });

    if (!doc) {
      return apiError('Document non trouvé', 404);
    }

    // Suppression du fichier local si présent
    if (doc.filePath) {
      try {
        await fs.unlink(doc.filePath);
      } catch (err) {
        console.warn('Fichier physique introuvable ou déjà supprimé :', err);
      }
    }

    await prisma.document.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true, id });
  } catch (error) {
    console.error('Erreur DELETE /api/documents/[id] :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * PATCH /api/documents/[id]
 * Permet de reclasser un document vers une matière académique
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const { id } = params;
    const body = await request.json();
    const subjectName = (body.subject_name || '').trim();
    const subjectColor = body.subject_color || '#4F46E5';

    if (!subjectName) {
      return apiError('Le nom de la matière est requis', 400);
    }

    const doc = await prisma.document.findFirst({
      where: { id, userId: user.id },
    });

    if (!doc) {
      return apiError('Document non trouvé', 404);
    }

    let subjectRecord = await prisma.subject.findFirst({
      where: { userId: user.id, name: subjectName },
    });

    if (!subjectRecord) {
      subjectRecord = await prisma.subject.create({
        data: {
          userId: user.id,
          name: subjectName,
          color: subjectColor,
        },
      });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        subjectId: subjectRecord.id,
      },
      include: {
        subject: true,
      },
    });

    // Mettre aussi à jour les flashcards rattachées à ce document
    await prisma.flashcard.updateMany({
      where: { documentId: id, userId: user.id },
      data: { subjectId: subjectRecord.id },
    });

    return apiSuccess({
      id: updated.id,
      subject_id: updated.subjectId,
      subject_name: updated.subject?.name || subjectName,
      subject_color: updated.subject?.color || subjectColor,
    });
  } catch (error) {
    console.error('Erreur PATCH /api/documents/[id] :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
