import { prisma } from '@/lib/db/prisma';

const ORDERED_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

type DayKey = (typeof ORDERED_DAYS)[number];

interface TimeWindow {
  start: string;
  end: string;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Trouve des créneaux libres de 90 minutes (entre 08h30 et 19h30) qui ne chevauchent aucun cours obligatoire
 */
function findFreeRevisionWindows(
  busyIntervals: Array<{ startTime: string; endTime: string }>,
  maxSlotsForDay = 2
): TimeWindow[] {
  const candidateStarts = [
    8 * 60 + 30,  // 08:30
    10 * 60 + 30, // 10:30
    14 * 60,      // 14:00
    16 * 60 + 15, // 16:15
    18 * 60,      // 18:00
  ];
  const slotDuration = 90; // 1h30
  const buffer = 15; // 15 min de pause avant/après un cours

  const busy = busyIntervals.map((b) => ({
    start: timeToMinutes(b.startTime) - buffer,
    end: timeToMinutes(b.endTime) + buffer,
  }));

  const selected: TimeWindow[] = [];

  for (const startMin of candidateStarts) {
    if (selected.length >= maxSlotsForDay) break;
    const endMin = startMin + slotDuration;

    const overlapsCourse = busy.some(
      (b) => startMin < b.end && endMin > b.start
    );
    const overlapsSelected = selected.some((s) => {
      const sStart = timeToMinutes(s.start) - buffer;
      const sEnd = timeToMinutes(s.end) + buffer;
      return startMin < sEnd && endMin > sStart;
    });

    if (!overlapsCourse && !overlapsSelected) {
      selected.push({
        start: minutesToTime(startMin),
        end: minutesToTime(endMin),
      });
    }
  }

  return selected;
}

/**
 * Récupère les cours réels de l'étudiant (sans injection de données simulées)
 */
export async function ensureDefaultScheduleEntries(userId: string) {
  return prisma.scheduleEntry.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

/**
 * Calcule et synchronise automatiquement le Planning de Révision avec :
 * 1. Les créneaux libres entre les cours de l'Emploi du Temps (ScheduleEntry)
 * 2. Les cours déposés dans Mes Cours (Document) et leur score de maîtrise (Quiz.bestScore)
 */
export async function syncPlanningWithSchedule(
  userId: string,
  options?: { targetHoursPerDay?: number; forceRebuild?: boolean }
) {
  const scheduleEntries = await ensureDefaultScheduleEntries(userId);

  // Vérifier s'il existe déjà un planning actif avec des créneaux
  const existingPlan = await prisma.revisionPlan.findFirst({
    where: { userId, isActive: true },
    include: {
      slots: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingPlan && existingPlan.slots.length > 0 && !options?.forceRebuild) {
    return existingPlan;
  }

  // Récupérer les documents de cours et leurs scores de maîtrise pour prioriser les matières
  const documents = await prisma.document.findMany({
    where: { userId },
    include: {
      subject: true,
      quizzes: true,
    },
  });

  // Synchroniser les matières dans la table Subject pour que "Espace Étude & Révisions" en bénéficie immédiatement
  for (const entry of scheduleEntries) {
    let existingSubject = await prisma.subject.findFirst({
      where: { userId, name: entry.subjectName },
    });
    if (!existingSubject) {
      existingSubject = await prisma.subject.create({
        data: {
          userId,
          name: entry.subjectName,
          color: entry.color || '#4F46E5',
          professor: entry.professor || null,
        },
      });
    }
    if (!entry.subjectId) {
      await prisma.scheduleEntry.update({
        where: { id: entry.id },
        data: { subjectId: existingSubject.id },
      });
    }
  }

  // Construire la liste des matières à partir de l'Emploi du Temps actif de l'étudiant
  const subjectStatsMap = new Map<
    string,
    { subjectName: string; mastery: number; chapters: string[] }
  >();

  const uniqueScheduleSubjects: string[] = [];
  for (const entry of scheduleEntries) {
    if (!subjectStatsMap.has(entry.subjectName)) {
      uniqueScheduleSubjects.push(entry.subjectName);
      subjectStatsMap.set(entry.subjectName, {
        subjectName: entry.subjectName,
        mastery: 60,
        chapters: [],
      });
    }
  }

  for (const doc of documents) {
    const subjName = doc.subject?.name || 'Cours Général';

    const bestScore =
      doc.quizzes.length > 0
        ? Math.max(...doc.quizzes.map((q) => q.bestScore ?? 50))
        : 55;

    // Associer le document à une matière de l'emploi du temps si elle correspond
    const matchedEntryKey = Array.from(subjectStatsMap.keys()).find(
      (k) => k.toLowerCase() === subjName.toLowerCase()
    );

    if (matchedEntryKey) {
      const existing = subjectStatsMap.get(matchedEntryKey)!;
      existing.mastery = Math.min(existing.mastery, bestScore);
      existing.chapters.push(doc.title);
    } else if (scheduleEntries.length === 0) {
      subjectStatsMap.set(subjName, {
        subjectName: subjName,
        mastery: bestScore,
        chapters: [doc.title],
      });
    }
  }

  // Trier les matières de la moins maîtrisée (priorité haute) à la mieux maîtrisée
  const prioritizedSubjects = Array.from(subjectStatsMap.values()).sort(
    (a, b) => a.mastery - b.mastery
  );

  if (prioritizedSubjects.length === 0) {
    // Aucun cours dans l'emploi du temps ni aucun document téléversé : pas de créneaux fictifs
    await prisma.revisionSlot.deleteMany({
      where: { userId },
    });
    await prisma.revisionPlan.deleteMany({
      where: { userId },
    });

    return prisma.revisionPlan.create({
      data: {
        userId,
        title: 'Planning Synchronisé avec Emploi du Temps & Cours',
        weekStartDate: new Date(),
        isActive: true,
      },
      include: {
        slots: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
  }

  const maxSlotsPerDay =
    options?.targetHoursPerDay && options.targetHoursPerDay >= 4 ? 2 : 2;

  const generatedSlots: Array<{
    userId: string;
    subjectName: string;
    dayOfWeek: DayKey;
    startTime: string;
    endTime: string;
    focusTopic: string;
    priority: 'high' | 'medium' | 'low';
    status: string;
  }> = [];

  let subjectCursor = 0;

  for (const day of ORDERED_DAYS) {
    const dayClasses = scheduleEntries.filter(
      (e) => e.dayOfWeek.toLowerCase() === day
    );

    const freeWindows = findFreeRevisionWindows(
      dayClasses,
      day === 'saturday' ? 1 : maxSlotsPerDay
    );

    for (let i = 0; i < freeWindows.length; i++) {
      const win = freeWindows[i];

      // Privilégier la révision d'un cours qui a lieu le jour même, sinon tourner équitablement sur les matières de l'emploi du temps
      const sameDayClass = dayClasses[i];
      const chosenSubject = sameDayClass
        ? subjectStatsMap.get(sameDayClass.subjectName) ||
          prioritizedSubjects[subjectCursor % prioritizedSubjects.length]
        : prioritizedSubjects[subjectCursor % prioritizedSubjects.length];

      subjectCursor++;

      const priority: 'high' | 'medium' | 'low' =
        chosenSubject.mastery < 60
          ? 'high'
          : chosenSubject.mastery < 80
          ? 'medium'
          : 'low';

      const chapterHint =
        chosenSubject.chapters[0] || `Synthèse & exercices — ${chosenSubject.subjectName}`;

      // Progression pédagogique active (sans notation J+)
      let intervalLabel = 'Consolidation : QCM & Test actif';
      if (sameDayClass) {
        intervalLabel = 'Rappel immédiat : Flashcards & Synthèse active';
      } else if (day === 'friday' || day === 'saturday') {
        intervalLabel = 'Ancrage mnésique : Révision approfondie';
      } else if (i === 1) {
        intervalLabel = 'Application : Exercices & Résolution de cas';
      }

      const focusTopic =
        priority === 'high'
          ? `${intervalLabel} (Prioritaire ${chosenSubject.mastery}%) — ${chapterHint}`
          : `${intervalLabel} — ${chapterHint}`;

      generatedSlots.push({
        userId,
        subjectName: chosenSubject.subjectName,
        dayOfWeek: day,
        startTime: win.start,
        endTime: win.end,
        focusTopic,
        priority,
        status: 'pending',
      });
    }
  }

  // Supprimer les anciens plannings et créneaux pour garantir une synchronisation 100% propre
  await prisma.revisionSlot.deleteMany({
    where: { userId },
  });
  await prisma.revisionPlan.deleteMany({
    where: { userId },
  });

  const newPlan = await prisma.revisionPlan.create({
    data: {
      userId,
      title: 'Planning Synchronisé avec Emploi du Temps & Cours',
      weekStartDate: new Date(),
      isActive: true,
      slots: {
        create: generatedSlots,
      },
    },
    include: {
      slots: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  return newPlan;
}
