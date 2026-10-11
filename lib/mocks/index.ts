import type { ScheduleEntry, DayOfWeek } from "@/types/database"
import type { RevisionSlot, ParseScheduleResponse } from "@/types/api"

/**
 * Mocks for routes that do not exist yet (see docs/HANDOFF.md).
 * Disable with NEXT_PUBLIC_USE_MOCKS=false once the backend routes ship.
 */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false"

const MOCK_USER = "00000000-0000-0000-0000-000000000000"
const CREATED = "2026-10-01T08:00:00.000Z"

function entry(
  id: number,
  subject: string,
  day_of_week: DayOfWeek,
  start_time: string,
  end_time: string,
  room: string | null
): ScheduleEntry {
  return {
    id: `mock-entry-${id}`,
    user_id: MOCK_USER,
    subject,
    day_of_week,
    start_time,
    end_time,
    room,
    created_at: CREATED,
  }
}

export const mockScheduleEntries: ScheduleEntry[] = [
  entry(1, "Algorithmique", "monday", "08:00", "10:00", "Amphi A"),
  entry(2, "Analyse mathématique", "monday", "10:30", "12:30", "Salle 204"),
  entry(3, "Anglais technique", "monday", "15:00", "16:30", "Salle 12"),
  entry(4, "Bases de données", "tuesday", "08:00", "10:00", "Labo Info 2"),
  entry(5, "Physique", "tuesday", "14:00", "16:00", "Amphi B"),
  entry(6, "Algèbre linéaire", "wednesday", "09:00", "11:00", "Salle 204"),
  entry(7, "Programmation web", "wednesday", "14:00", "17:00", "Labo Info 1"),
  entry(8, "Algorithmique", "thursday", "10:00", "12:00", "Labo Info 2"),
  entry(9, "Systèmes d'exploitation", "thursday", "14:00", "16:00", "Amphi A"),
  entry(10, "Analyse mathématique", "friday", "08:00", "10:00", "Salle 204"),
  entry(11, "Bases de données", "friday", "10:30", "12:30", "Labo Info 2"),
  entry(12, "Projet tutoré", "saturday", "09:00", "12:00", "Salle 08"),
]

/** Today's AI-generated revision plan (mock of POST /api/schedule/generate-planning). */
export function mockRevisionSlots(day: DayOfWeek): RevisionSlot[] {
  return [
    {
      subject: "Algorithmique",
      day_of_week: day,
      start_time: "17:00",
      end_time: "17:50",
      activity: "Révision : tri fusion et complexité",
      tips: "Refais l'exercice 3 du TD sans regarder la correction.",
    },
    {
      subject: "Pause",
      day_of_week: day,
      start_time: "17:50",
      end_time: "18:05",
      activity: "Pause active",
    },
    {
      subject: "Analyse mathématique",
      day_of_week: day,
      start_time: "18:05",
      end_time: "18:55",
      activity: "Flashcards : limites et continuité",
    },
    {
      subject: "Bases de données",
      day_of_week: day,
      start_time: "20:30",
      end_time: "21:15",
      activity: "Quiz SQL : jointures",
      tips: "Vise au moins 8/10 avant de passer aux sous-requêtes.",
    },
  ]
}

/** Mock of POST /api/schedule/parse. */
export const mockParseResult: ParseScheduleResponse = {
  entries: mockScheduleEntries.map(({ subject, day_of_week, start_time, end_time, room }) => ({
    subject,
    day_of_week,
    start_time,
    end_time,
    room,
  })),
  saved_count: mockScheduleEntries.length,
}

export interface UpcomingExam {
  id: string
  title: string
  subject: string
  exam_date: string
}

/** Mock of a future GET /api/exams. */
export function mockUpcomingExams(now = new Date()): UpcomingExam[] {
  const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString()
  return [
    { id: "exam-1", title: "Partiel d'algorithmique", subject: "Algorithmique", exam_date: inDays(6) },
    { id: "exam-2", title: "Contrôle continu SQL", subject: "Bases de données", exam_date: inDays(11) },
    { id: "exam-3", title: "Examen d'analyse", subject: "Analyse mathématique", exam_date: inDays(19) },
  ]
}

/** Minutes studied per day this week (mock of future stats endpoint), Monday first. */
export const mockWeeklyStudyMinutes = [95, 120, 60, 150, 80, 45, 0]
