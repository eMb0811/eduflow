/**
 * Database Types for EduFlow
 * Corresponds to Supabase PostgreSQL schema with strict typing
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type Priority = 'low' | 'medium' | 'high';
export type SlotStatus = 'pending' | 'completed' | 'missed';
export type MessageRole = 'user' | 'assistant' | 'system';
export type FlashcardDifficulty = 'easy' | 'medium' | 'hard';
export type PomodoroType = 'study' | 'short_break' | 'long_break';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      subjects: {
        Row: Subject;
        Insert: SubjectInsert;
        Update: SubjectUpdate;
      };
      schedule_entries: {
        Row: ScheduleEntry;
        Insert: ScheduleEntryInsert;
        Update: ScheduleEntryUpdate;
      };
      revision_plans: {
        Row: RevisionPlan;
        Insert: RevisionPlanInsert;
        Update: RevisionPlanUpdate;
      };
      revision_slots: {
        Row: RevisionSlot;
        Insert: RevisionSlotInsert;
        Update: RevisionSlotUpdate;
      };
      chat_sessions: {
        Row: ChatSession;
        Insert: ChatSessionInsert;
        Update: ChatSessionUpdate;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: ChatMessageInsert;
        Update: ChatMessageUpdate;
      };
      documents: {
        Row: Document;
        Insert: DocumentInsert;
        Update: DocumentUpdate;
      };
      flashcards: {
        Row: Flashcard;
        Insert: FlashcardInsert;
        Update: FlashcardUpdate;
      };
      quizzes: {
        Row: Quiz;
        Insert: QuizInsert;
        Update: QuizUpdate;
      };
      quiz_questions: {
        Row: QuizQuestion;
        Insert: QuizQuestionInsert;
        Update: QuizQuestionUpdate;
      };
      pomodoro_sessions: {
        Row: PomodoroSession;
        Insert: PomodoroSessionInsert;
        Update: PomodoroSessionUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ----------------------------------------------------
// Entity Rows
// ----------------------------------------------------

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  academic_level: string | null;
  field_of_study: string | null;
  academic_goals: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Partial<Omit<Profile, 'id'>> & { id: string };
export type ProfileUpdate = Partial<Omit<Profile, 'id'>>;

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  color: string;
  coefficient: number;
  professor: string | null;
  created_at: string;
  updated_at: string;
}

export type SubjectInsert = Omit<Subject, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type SubjectUpdate = Partial<Omit<Subject, 'id' | 'user_id'>>;

export interface ScheduleEntry {
  id: string;
  user_id: string;
  subject_id: string | null;
  subject_name: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:mm format e.g. "08:30"
  end_time: string;   // HH:mm format e.g. "10:30"
  room: string | null;
  professor: string | null;
  color: string;
  recurrence: string;
  created_at: string;
  updated_at: string;
}

export type ScheduleEntryInsert = Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type ScheduleEntryUpdate = Partial<Omit<ScheduleEntry, 'id' | 'user_id'>>;

export interface RevisionPlan {
  id: string;
  user_id: string;
  title: string;
  week_start_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RevisionPlanInsert = Omit<RevisionPlan, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type RevisionPlanUpdate = Partial<Omit<RevisionPlan, 'id' | 'user_id'>>;

export interface RevisionSlot {
  id: string;
  plan_id: string | null;
  user_id: string;
  subject_name: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  focus_topic: string | null;
  priority: Priority;
  status: SlotStatus;
  created_at: string;
  updated_at: string;
}

export type RevisionSlotInsert = Omit<RevisionSlot, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type RevisionSlotUpdate = Partial<Omit<RevisionSlot, 'id' | 'user_id'>>;

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  subject_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ChatSessionInsert = Omit<ChatSession, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type ChatSessionUpdate = Partial<Omit<ChatSession, 'id' | 'user_id'>>;

export interface ChatMessage {
  id: string;
  session_id: string | null;
  user_id: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ChatMessageInsert = Omit<ChatMessage, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type ChatMessageUpdate = Partial<Omit<ChatMessage, 'id' | 'user_id'>>;

export interface Document {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  file_url: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  extracted_text: string | null;
  summary: string | null;
  key_concepts: string[];
  created_at: string;
  updated_at: string;
}

export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type DocumentUpdate = Partial<Omit<Document, 'id' | 'user_id'>>;

export interface Flashcard {
  id: string;
  user_id: string;
  document_id: string | null;
  subject_id: string | null;
  question: string;
  answer: string;
  difficulty: FlashcardDifficulty;
  review_count: number;
  last_reviewed_at: string | null;
  created_at: string;
}

export type FlashcardInsert = Omit<Flashcard, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type FlashcardUpdate = Partial<Omit<Flashcard, 'id' | 'user_id'>>;

export interface Quiz {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  description: string | null;
  total_questions: number;
  best_score: number | null;
  created_at: string;
}

export type QuizInsert = Omit<Quiz, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type QuizUpdate = Partial<Omit<Quiz, 'id' | 'user_id'>>;

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer_index: number;
  explanation: string | null;
  order_num: number;
  created_at: string;
}

export type QuizQuestionInsert = Omit<QuizQuestion, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type QuizQuestionUpdate = Partial<Omit<QuizQuestion, 'id'>>;

export interface PomodoroSession {
  id: string;
  user_id: string;
  subject_id: string | null;
  duration_minutes: number;
  type: PomodoroType;
  notes: string | null;
  completed_at: string;
  created_at: string;
}

export type PomodoroSessionInsert = Omit<PomodoroSession, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type PomodoroSessionUpdate = Partial<Omit<PomodoroSession, 'id' | 'user_id'>>;
