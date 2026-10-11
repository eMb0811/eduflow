import { Profile } from './database'

/**
 * Standard unified API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
}

/**
 * Profile endpoints types
 */
export interface ProfileResponse {
  profile: Profile
}

export interface UpdateProfileRequest {
  full_name?: string
  academic_level?: string
  field_of_study?: string
  academic_goals?: string
  avatar_url?: string
}

/**
 * Schedule parsing & OCR types
 */
export interface ScheduleParsedItem {
  subject: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start_time: string // HH:mm format (24h)
  end_time: string // HH:mm format (24h)
  room: string | null
}

export interface ParseScheduleResponse {
  entries: ScheduleParsedItem[]
  saved_count: number
}

/**
 * Planning generator types
 */
export interface RevisionSlot {
  subject: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start_time: string
  end_time: string
  activity: string
  tips?: string
}

export interface GeneratePlanningResponse {
  slots: RevisionSlot[]
}

/**
 * Flashcards & Quiz types
 */
export interface Flashcard {
  id?: string
  question: string
  answer: string
  category?: string
}

export interface FlashcardsResponse {
  flashcards: Flashcard[]
}

export interface QuizQuestion {
  id?: string
  question: string
  options: string[]
  correct_option_index: number
  explanation: string
}

export interface QuizResponse {
  title: string
  questions: QuizQuestion[]
}

/**
 * Document & Study Materials types
 */
export interface DocumentSummary {
  title: string
  overview: string
  key_concepts: Array<{
    concept: string
    explanation: string
  }>
  detailed_summary: string
  key_takeaways: string[]
}

export interface SummarizeDocumentResponse {
  summary: DocumentSummary
}
