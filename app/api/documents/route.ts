import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { createDocumentSchema } from '@/lib/validations/document';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import { analyzeCourseAutomatically } from '@/lib/courses/kocc-packs';
import { extractDocumentContent, processCourseDocumentWithAi } from '@/lib/courses/document-processor';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

function safeParseConcepts(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return [raw];
  }
}

/**
 * GET /api/documents
 * Liste tous les cours et Packs de Révision Kocc de l'étudiant
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const documents = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        subject: true,
        flashcards: true,
        quizzes: {
          include: {
            questions: {
              orderBy: { orderNum: 'asc' },
            },
          },
        },
      },
    });

    return apiSuccess(
      documents.map((doc) => {
        const bestQuizScore =
          doc.quizzes.length > 0
            ? Math.max(...doc.quizzes.map((q) => q.bestScore ?? 0))
            : 0;

        return {
          id: doc.id,
          user_id: doc.userId,
          subject_id: doc.subjectId,
          subject_name: doc.subject?.name || 'Cours Général',
          subject_color: doc.subject?.color || '#4F46E5',
          title: doc.title,
          file_url: doc.fileUrl,
          file_path: doc.filePath,
          file_type: doc.fileType,
          file_size: doc.fileSize ? Number(doc.fileSize) : null,
          extracted_text: doc.extractedText,
          summary: doc.summary,
          key_concepts: safeParseConcepts(doc.keyConcepts),
          flashcards_count: doc.flashcards.length,
          quizzes_count: doc.quizzes.length,
          mastery_score: bestQuizScore,
          created_at: doc.createdAt.toISOString(),
          updated_at: doc.updatedAt.toISOString(),
        };
      })
    );
  } catch (error) {
    console.error('Erreur GET /api/documents :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}

/**
 * POST /api/documents
 * Pipeline double :
 * A) Dépôt d'un fichier de cours (PDF, TXT, MD)
 * B) Génération d'un Pack de Révision Kocc SANS PDF (à partir de la matière + thème/chapitre saisi)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const userProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { academicLevel: true, fieldOfStudy: true },
    });

    const scheduleEntries = await prisma.scheduleEntry.findMany({
      where: { userId: user.id },
      select: { subjectName: true, color: true },
    });
    const scheduleSubjects = scheduleEntries.map((e) => ({
      name: e.subjectName,
      color: e.color || '#4F46E5',
    }));

    const contentType = request.headers.get('content-type') || '';

    let rawTitle = 'Document de cours';
    let explicitSubjectName: string | undefined = undefined;
    let fileUrl = '/uploads/documents/document.pdf';
    let filePath = '/uploads/documents/document.pdf';
    let fileType = 'application/pdf';
    let fileSize: bigint | null = null;
    let extractedText: string | null = null;
    let uploadedBuffer: Buffer | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return apiError('Fichier manquant dans la requête (champ "file")', 400);
      }

      rawTitle = (formData.get('title') as string) || file.name;
      explicitSubjectName = (formData.get('subject_name') as string) || undefined;
      fileType = file.type || 'application/octet-stream';
      fileSize = BigInt(file.size);

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
      await fs.mkdir(uploadDir, { recursive: true });

      const safeFileName = `${user.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      filePath = path.join(uploadDir, safeFileName);
      fileUrl = `/uploads/documents/${safeFileName}`;

      const arrayBuffer = await file.arrayBuffer();
      uploadedBuffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, uploadedBuffer);

      // Extraction RÉELLE du contenu (PDF numérique, PDF scanné via OCR Gemini, TXT, MD)
      try {
        extractedText = await extractDocumentContent(uploadedBuffer, file.name, fileType);
      } catch (extractErr) {
        console.error('[POST /api/documents] Erreur extraction texte :', extractErr);
        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          extractedText = uploadedBuffer.toString('utf-8');
        }
      }
    } else {
      const body = await request.json();
      const validationResult = createDocumentSchema.safeParse(body);

      if (!validationResult.success) {
        return apiError('Métadonnées de document invalides', 400, {
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const docData = validationResult.data;
      rawTitle = docData.title;
      fileUrl = docData.file_url;
      filePath = docData.file_path;
      fileType = docData.file_type || 'application/pdf';
      fileSize = docData.file_size ? BigInt(docData.file_size) : null;
      extractedText = docData.extracted_text || null;
    }

    // Analyse pédagogique approfondie avec Gemini 3.8 Flash à partir du CONTENU RÉEL
    const analysis = await processCourseDocumentWithAi({
      rawTitle,
      extractedText,
      fileBuffer: uploadedBuffer,
      fileType,
      scheduleSubjects,
      explicitSubjectName,
      academicLevel: userProfile?.academicLevel,
    });

    let subjectRecord = await prisma.subject.findFirst({
      where: { userId: user.id, name: analysis.subjectName },
    });

    if (!subjectRecord) {
      subjectRecord = await prisma.subject.create({
        data: {
          userId: user.id,
          name: analysis.subjectName,
          color: analysis.subjectColor,
        },
      });
    }

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        subjectId: subjectRecord.id,
        title: analysis.cleanTitle,
        fileUrl,
        filePath,
        fileType,
        fileSize,
        extractedText: extractedText || analysis.summary,
        summary: analysis.summary,
        keyConcepts: JSON.stringify(analysis.keyConcepts),
      },
    });

    await prisma.flashcard.createMany({
      data: analysis.flashcards.map((f) => ({
        userId: user.id,
        documentId: document.id,
        subjectId: subjectRecord.id,
        question: f.question,
        answer: f.answer,
        difficulty: f.difficulty,
      })),
    });

    const quiz = await prisma.quiz.create({
      data: {
        userId: user.id,
        documentId: document.id,
        title: `Évaluation — ${analysis.cleanTitle}`,
        description: `Quiz généré automatiquement pour ${analysis.subjectName}`,
        totalQuestions: analysis.quizQuestions.length,
        bestScore: null,
      },
    });

    await prisma.quizQuestion.createMany({
      data: analysis.quizQuestions.map((q, idx) => ({
        quizId: quiz.id,
        question: q.question,
        options: JSON.stringify(q.options),
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
        orderNum: idx + 1,
      })),
    });

    return apiSuccess(
      {
        id: document.id,
        user_id: document.userId,
        subject_id: subjectRecord.id,
        subject_name: subjectRecord.name,
        subject_color: subjectRecord.color,
        title: document.title,
        file_url: document.fileUrl,
        file_path: document.filePath,
        file_type: document.fileType,
        file_size: document.fileSize ? Number(document.fileSize) : null,
        extracted_text: document.extractedText,
        summary: document.summary,
        key_concepts: analysis.keyConcepts,
        flashcards_count: analysis.flashcards.length,
        quizzes_count: 1,
        mastery_score: 60,
        planning_synced: true,
        created_at: document.createdAt.toISOString(),
        updated_at: document.updatedAt.toISOString(),
      },
      201
    );
  } catch (error) {
    console.error('Erreur POST /api/documents :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
