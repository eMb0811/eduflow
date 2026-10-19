import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { analyzeMediaWithVision } from '@/lib/ai/gemini';
import { SCHEDULE_OCR_PROMPT } from '@/lib/ai/prompts';
import { scheduleItemSchema } from '@/lib/validations/schedule';
import { apiSuccess, apiError } from '@/lib/api/response';
import { ParsedScheduleItem, ParseScheduleResponseData } from '@/types/api';
import { prisma } from '@/lib/db/prisma';
import { syncPlanningWithSchedule } from '@/lib/schedule/auto-planner';
import { parseScheduleFromPdfBuffer } from '@/lib/schedule/pdf-schedule-parser';
import fs from 'fs/promises';
import path from 'path';

/**
 * POST /api/schedule/parse
 * Extrait les cours d'un emploi du temps (image ou PDF), sauvegarde dans MySQL
 * et synchronise automatiquement le Planning de révision avec les créneaux libres
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    let base64Data = '';
    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let mimeType = 'image/png';
    let saveImmediately = false;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      saveImmediately = formData.get('save_immediately') === 'true';

      if (!file) {
        return apiError('Fichier manquant dans la requête (champ "file" requis)', 400);
      }

      fileName = file.name || '';
      mimeType = file.type || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      base64Data = fileBuffer.toString('base64');

      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'schedules');
        await fs.mkdir(uploadDir, { recursive: true });
        const safeFileName = `${user.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        await fs.writeFile(path.join(uploadDir, safeFileName), fileBuffer);
      } catch (storageError) {
        console.warn('Erreur sauvegarde locale du fichier :', storageError);
      }
    } else {
      const jsonBody = await request.json();
      saveImmediately = !!jsonBody.save_immediately;

      if (jsonBody.file_base64) {
        base64Data = jsonBody.file_base64;
        mimeType = jsonBody.mime_type || 'image/png';
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else if (jsonBody.file_url) {
        const res = await fetch(jsonBody.file_url);
        if (!res.ok) {
          return apiError(`Impossible de récupérer le fichier depuis l'URL fournie (${res.status})`, 400);
        }
        mimeType = res.headers.get('content-type') || 'image/jpeg';
        const arrayBuf = await res.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
        base64Data = fileBuffer.toString('base64');
      } else {
        return apiError('Veuillez fournir un fichier via multipart/form-data, file_base64 ou file_url', 400);
      }
    }

    if (!base64Data || !fileBuffer) {
      return apiError('Données de fichier vides ou corrompues', 400);
    }

    const validItems: ParsedScheduleItem[] = [];
    const isPdf =
      mimeType.toLowerCase().includes('pdf') ||
      fileName.toLowerCase().endsWith('.pdf') ||
      fileBuffer.subarray(0, 5).toString('ascii') === '%PDF-';

    // 1. Extraction géométrique 2D directe pour les fichiers PDF natifs
    if (isPdf) {
      try {
        const pdfItems = await parseScheduleFromPdfBuffer(fileBuffer);
        for (const item of pdfItems) {
          const result = scheduleItemSchema.safeParse(item);
          if (result.success) {
            validItems.push(result.data as ParsedScheduleItem);
          }
        }
      } catch (pdfErr) {
        console.warn('Erreur extraction PDF locale :', pdfErr);
      }
    }

    // 2. Tentative OCR via Gemini Vision pour les images ou PDF scannés si clé configurée
    if (validItems.length === 0 && process.env.GEMINI_API_KEY) {
      try {
        const parsedResult = await analyzeMediaWithVision<{ items: ParsedScheduleItem[] }>(
          base64Data,
          mimeType,
          SCHEDULE_OCR_PROMPT,
          'Extrais méticuleusement tous les cours de cet emploi du temps au format JSON strict.'
        );

        const rawItems = parsedResult?.items || [];
        for (const item of rawItems) {
          const result = scheduleItemSchema.safeParse(item);
          if (result.success) {
            validItems.push(result.data as ParsedScheduleItem);
          }
        }
      } catch (ocrErr) {
        console.warn('Fallback OCR local suite à indisponibilité Gemini :', ocrErr);
      }
    }

    if (validItems.length === 0) {
      return apiError(
        "Aucun cours n'a pu être extrait de ce document. Veuillez fournir un emploi du temps PDF lisible ou une image nette.",
        422
      );
    }

    if (saveImmediately && validItems.length > 0) {
      // Remplacer l'ancien emploi du temps par les nouveaux créneaux extraits
      await prisma.scheduleEntry.deleteMany({
        where: { userId: user.id },
      });

      // 1. Créer ou mettre à jour les matières extraites dans la table Subject
      const subjectMap = new Map<string, string>();
      for (const item of validItems) {
        let subj = await prisma.subject.findFirst({
          where: { userId: user.id, name: item.subject_name },
        });
        if (!subj) {
          subj = await prisma.subject.create({
            data: {
              userId: user.id,
              name: item.subject_name,
              color: item.color || '#3B82F6',
              professor: item.professor || null,
            },
          });
        }
        subjectMap.set(item.subject_name, subj.id);
      }

      await prisma.$transaction(
        validItems.map((item) =>
          prisma.scheduleEntry.create({
            data: {
              userId: user.id,
              subjectId: subjectMap.get(item.subject_name) || null,
              subjectName: item.subject_name,
              dayOfWeek: item.day_of_week,
              startTime: item.start_time,
              endTime: item.end_time,
              room: item.room || null,
              professor: item.professor || null,
              color: item.color || '#3B82F6',
              recurrence: 'weekly',
            },
          })
        )
      );

      // Synchroniser automatiquement le Planning de Révision avec le nouvel Emploi du Temps
      await syncPlanningWithSchedule(user.id, { forceRebuild: true });
    }

    const responsePayload: ParseScheduleResponseData = {
      items: validItems,
      count: validItems.length,
    };

    return apiSuccess<ParseScheduleResponseData>(responsePayload);
  } catch (error) {
    console.error('Erreur POST /api/schedule/parse :', error);
    return apiError(
      error instanceof Error ? error.message : "Erreur lors du traitement de l'emploi du temps",
      500
    );
  }
}
