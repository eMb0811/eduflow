export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type PomodoroType = 'work' | 'short_break' | 'long_break'

export type ChatRole = 'user' | 'assistant' | 'system'

export type Profile = {
  id: string
  full_name: string | null
  academic_level: string | null
  field_of_study: string | null
  academic_goals: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Subject = {
  id: string
  user_id: string
  name: string
  color: string | null
  created_at: string
}

export type Exam = {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  exam_date: string
  created_at: string
}

export type ScheduleEntry = {
  id: string
  user_id: string
  subject: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  room: string | null
  created_at: string
}

export type Document = {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  file_url: string
  created_at: string
}

export type PomodoroSession = {
  id: string
  user_id: string
  duration_minutes: number
  type: PomodoroType
  completed_at: string
  created_at: string
}

export type ChatMessage = {
  id: string
  user_id: string
  role: ChatRole
  content: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
        Relationships: []
      }
      subjects: {
        Row: Subject
        Insert: Omit<Subject, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Subject, 'id'>>
        Relationships: []
      }
      exams: {
        Row: Exam
        Insert: Omit<Exam, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Exam, 'id'>>
        Relationships: [
          {
            foreignKeyName: 'exams_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          }
        ]
      }
      schedule_entries: {
        Row: ScheduleEntry
        Insert: Omit<ScheduleEntry, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<ScheduleEntry, 'id'>>
        Relationships: []
      }
      documents: {
        Row: Document
        Insert: Omit<Document, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Document, 'id'>>
        Relationships: [
          {
            foreignKeyName: 'documents_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'subjects'
            referencedColumns: ['id']
          }
        ]
      }
      pomodoro_sessions: {
        Row: PomodoroSession
        Insert: Omit<PomodoroSession, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<PomodoroSession, 'id'>>
        Relationships: []
      }
      chat_messages: {
        Row: ChatMessage
        Insert: Omit<ChatMessage, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<ChatMessage, 'id'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
