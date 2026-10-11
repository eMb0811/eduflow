import type { ScheduleEntry, Exam, Profile, PomodoroSession, ChatMessage, Document } from "@/types/database"
import { mockScheduleEntries, mockUpcomingExams } from "@/lib/mocks"

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000"

export interface DevStore {
  profile: Profile
  scheduleEntries: ScheduleEntry[]
  exams: Exam[]
  pomodoroSessions: PomodoroSession[]
  chatMessages: ChatMessage[]
  documents: Document[]
}

const defaultProfile: Profile = {
  id: DEMO_USER_ID,
  full_name: "Fatou Ndiaye",
  academic_level: "Licence 3",
  field_of_study: "Informatique / Génie Logiciel",
  academic_goals: "Valider mon semestre avec mention et préparer mes examens",
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// Global in-memory storage for development / demo when Supabase isn't connected yet
declare global {
  var __eduflowDevStore: DevStore | undefined
}

export function getDevStore(): DevStore {
  if (!globalThis.__eduflowDevStore) {
    globalThis.__eduflowDevStore = {
      profile: { ...defaultProfile },
      scheduleEntries: [...mockScheduleEntries],
      exams: mockUpcomingExams().map((e) => ({
        id: e.id,
        user_id: DEMO_USER_ID,
        subject_id: null,
        title: e.title,
        exam_date: e.exam_date,
        created_at: new Date().toISOString(),
      })),
      pomodoroSessions: [],
      chatMessages: [],
      documents: [],
    }
  }
  return globalThis.__eduflowDevStore
}
