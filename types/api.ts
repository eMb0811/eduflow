/**
 * API Contract Types for EduFlow
 * Standardized response format and endpoint contracts for Web Frontend & Mobile
 */

import {
  Profile,
  ScheduleEntry,
  RevisionSlot,
  ChatMessage,
  Document,
  Flashcard,
  Quiz,
  PomodoroSession,
  DayOfWeek,
  Priority,
  PomodoroType,
  FlashcardDifficulty
} from './database';

// ----------------------------------------------------
// Standard API Envelope
// ----------------------------------------------------
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ----------------------------------------------------
// Module 1 : Authentification & Profil
// ----------------------------------------------------
export interface UpdateProfileRequest {
  full_name?: string;
  academic_level?: string;
  field_of_study?: string;
  academic_goals?: string | string[];
  avatar_url?: string;
}

export type ProfileResponse = ApiResponse<Profile>;

// ----------------------------------------------------
// Module 2 : OCR & Emploi du Temps
// ----------------------------------------------------
export interface ParsedScheduleItem {
  subject_name: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:mm format e.g. "08:30"
  end_time: string;   // HH:mm format e.g. "10:30"
  room?: string | null;
  professor?: string | null;
  color?: string;
}

export interface ParseScheduleResponseData {
  items: ParsedScheduleItem[];
  raw_text?: string;
  count: number;
}

export interface ParseScheduleResponse {
  data?: ScheduleEntry[] | ParseScheduleResponseData;
  success: boolean;
  raw_extraction?: string;
  error?: string;
}

export interface SaveScheduleEntriesRequest {
  entries: ParsedScheduleItem[];
  replace_existing?: boolean;
}

export type ScheduleEntriesResponse = ApiResponse<ScheduleEntry[]>;
export type SingleScheduleEntryResponse = ApiResponse<ScheduleEntry>;

// ----------------------------------------------------
// Module 3 : Génération de Planning Intelligent
// ----------------------------------------------------
export interface GeneratePlanningRequest {
  week_start_date?: string; // YYYY-MM-DD
  week_start?: string;
  academic_goals?: string;
  target_hours_per_day?: number;
  excluded_days?: DayOfWeek[];
  specific_subjects?: string[];
  preferences?: {
    preferred_study_duration?: number;
    break_frequency?: number;
    priority_subjects?: string[];
  };
  preferred_study_slots?: {
    start_time: string;
    end_time: string;
  }[];
}

export interface GeneratedRevisionSlot {
  subject_name: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  focus_topic: string;
  priority: Priority;
  rationale?: string;
}

export interface GeneratePlanningResponseData {
  plan_id?: string;
  title: string;
  total_slots: number;
  total_hours: number;
  slots: GeneratedRevisionSlot[];
}

export type GeneratePlanningResponse = ApiResponse<GeneratePlanningResponseData | RevisionSlot[]>;

// ----------------------------------------------------
// Module 4 : Assistant Pédagogique Intelligent (Chat IA)
// ----------------------------------------------------
export interface SendChatMessageRequest {
  message: string;
  session_id?: string;
  conversation_id?: string;
  subject_name?: string;
  document_id?: string;
  context?: string | {
    document_id?: string;
    subject?: string;
  };
  stream?: boolean;
}

export interface ChatStreamEvent {
  type: 'content' | 'done' | 'error';
  content?: string;
  message_id?: string;
  session_id?: string;
  error?: string;
}

export interface SendChatMessageResponseData {
  session_id: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

export type SendChatMessageResponse = ApiResponse<SendChatMessageResponseData>;

export interface ChatHistoryResponseData {
  session_id: string;
  title: string;
  messages: ChatMessage[];
}

export type ChatHistoryResponse = ApiResponse<ChatHistoryResponseData | ChatMessage[]>;

// ----------------------------------------------------
// Modules 5 & 6 : Cours, Synthèse, Flashcards & Quiz
// ----------------------------------------------------
export interface CreateDocumentRequest {
  title: string;
  file_url: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  subject_id?: string;
  extracted_text?: string;
}

export interface UploadDocumentRequest {
  file: File;
  title: string;
  subject_id?: string;
}

export type DocumentsResponse = ApiResponse<Document[]>;

export interface SummarizeDocumentRequest {
  document_id?: string;
  content?: string;
  title?: string;
  language?: 'fr' | 'en';
}

export interface DocumentSummaryResponseData {
  document_id?: string;
  title: string;
  summary: string;
  key_concepts: string[];
  recommended_review_topics?: string[];
}

export type DocumentSummaryResponse = ApiResponse<DocumentSummaryResponseData>;
export type SummarizeResponse = ApiResponse<{ summary: string; key_concepts?: string[] }>;

export interface GenerateFlashcardsRequest {
  document_id?: string;
  content?: string;
  subject_id?: string;
  count?: number; // Default: 10
}

export interface GeneratedFlashcardItem {
  question: string;
  answer: string;
  difficulty: FlashcardDifficulty;
}

export interface GenerateFlashcardsResponseData {
  document_id?: string;
  count: number;
  flashcards: (GeneratedFlashcardItem & { id?: string })[];
}

export type GenerateFlashcardsResponse = ApiResponse<GenerateFlashcardsResponseData>;
export type FlashcardsResponse = ApiResponse<Flashcard[]>;

export interface GenerateQuizRequest {
  document_id?: string;
  content?: string;
  topic?: string;
  count?: number; // Default: 5
}

export interface GeneratedQuizQuestionItem {
  question: string;
  options: [string, string, string, string];
  correct_answer_index: number;
  explanation: string;
}

export interface GenerateQuizResponseData {
  quiz_id?: string;
  document_id?: string;
  title: string;
  description: string;
  questions: (GeneratedQuizQuestionItem & { id?: string })[];
}

export type GenerateQuizResponse = ApiResponse<GenerateQuizResponseData>;
export type QuizResponse = ApiResponse<Quiz | GenerateQuizResponseData>;

export interface SubmitQuizRequest {
  quiz_id: string;
  answers: Record<string, number>;
}

export interface QuizResultResponse {
  score: number;
  total: number;
  percentage: number;
  details: {
    question_id: string;
    correct: boolean;
    correct_answer: number;
    user_answer: number;
    explanation?: string;
  }[];
}

// ----------------------------------------------------
// Modules 7 & 8 : Pomodoro & Dashboard Central
// ----------------------------------------------------
export interface CreatePomodoroRequest {
  duration_minutes: number;
  type: PomodoroType;
  subject_id?: string;
  subject?: string;
  notes?: string;
  completed_at?: string;
}

export type StartPomodoroRequest = CreatePomodoroRequest;

export interface PomodoroStatsResponseData {
  total_study_minutes_today: number;
  total_study_minutes_week: number;
  completed_sessions_today: number;
  completed_sessions_week: number;
  sessions: PomodoroSession[];
}

export type PomodoroStatsResponse = ApiResponse<PomodoroStatsResponseData>;
export type PomodoroResponse = ApiResponse<PomodoroSession>;

export interface StudyStatsData {
  total_study_minutes: number;
  total_sessions: number;
  streak_days: number;
  subjects_studied: string[];
  weekly_goal_progress: number;
}

export type StatsResponse = ApiResponse<StudyStatsData>;

export interface DashboardStatsResponseData {
  profile: Profile | null;
  study_minutes_today: number;
  study_minutes_week: number;
  today_schedule: ScheduleEntry[];
  today_revision_slots: RevisionSlot[];
  pending_flashcards_count: number;
  total_documents_count: number;
  recent_documents: Document[];
}

export interface DashboardData {
  profile: Profile;
  upcoming_classes: ScheduleEntry[];
  today_study_blocks: RevisionSlot[];
  stats: StudyStatsData;
  recent_documents: Document[];
}

export type DashboardStatsResponse = ApiResponse<DashboardStatsResponseData>;
export type DashboardResponse = ApiResponse<DashboardData>;
