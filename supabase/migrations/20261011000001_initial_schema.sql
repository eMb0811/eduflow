-- ==============================================================================
-- EduFlow MVP - Database Schema & Row Level Security (RLS)
-- Multi-Agent Hackathon Open Source x AI 2026
-- Sprint 1: Socle Technique & Base de Données
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE: PROFILES (Module 1)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  academic_level TEXT, -- e.g., 'Licence 1', 'Master 2', 'Lycée'
  field_of_study TEXT,  -- e.g., 'Informatique', 'Médecine', 'Droit'
  academic_goals TEXT,  -- e.g., 'Valider le semestre avec mention B'
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger pour auto-créer le profil lors de l'inscription via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TABLE: SUBJECTS (Matières académiques)
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  coefficient NUMERIC DEFAULT 1.0,
  professor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLE: SCHEDULE_ENTRIES (Module 2 - Emploi du temps extrait par OCR/IA)
CREATE TABLE IF NOT EXISTS public.schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  subject_name TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  professor TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  recurrence TEXT NOT NULL DEFAULT 'weekly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLE: REVISION_PLANS & REVISION_SLOTS (Module 3 - Planning intelligent)
CREATE TABLE IF NOT EXISTS public.revision_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Planning hebdomadaire',
  week_start_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.revision_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.revision_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  focus_topic TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABLE: CHAT_SESSIONS & CHAT_MESSAGES (Module 4 - Assistant IA & RAG)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nouvelle discussion',
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLE: DOCUMENTS, FLASHCARDS & QUIZZES (Modules 5 & 6 - Cours, Synthèse, Flashcards & Quiz)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  extracted_text TEXT,
  summary TEXT,
  key_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of strings: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer_index INTEGER NOT NULL CHECK (correct_answer_index >= 0),
  explanation TEXT,
  order_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABLE: POMODORO_SESSIONS (Module 7 - Chronomètre & Statistiques d'étude)
CREATE TABLE IF NOT EXISTS public.pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  type TEXT NOT NULL DEFAULT 'study' CHECK (type IN ('study', 'short_break', 'long_break')),
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Politiques pour PROFILES
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
  CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);

  DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
  CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

  DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
END $$;

-- Helper macro-like idempotent policies pour les tables avec user_id
DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'subjects',
      'schedule_entries',
      'revision_plans',
      'revision_slots',
      'chat_sessions',
      'chat_messages',
      'documents',
      'flashcards',
      'quizzes',
      'pomodoro_sessions'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_own" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_select_own" ON public.%I FOR SELECT USING (auth.uid() = user_id);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_own" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert_own" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "%s_update_own" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update_own" ON public.%I FOR UPDATE USING (auth.uid() = user_id);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "%s_delete_own" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete_own" ON public.%I FOR DELETE USING (auth.uid() = user_id);', tbl, tbl);
  END LOOP;
END $$;

-- Politique pour QUIZ_QUESTIONS (relié au quiz appartenant à l'utilisateur)
DO $$ BEGIN
  DROP POLICY IF EXISTS "quiz_questions_select_own" ON public.quiz_questions;
  CREATE POLICY "quiz_questions_select_own" ON public.quiz_questions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

  DROP POLICY IF EXISTS "quiz_questions_insert_own" ON public.quiz_questions;
  CREATE POLICY "quiz_questions_insert_own" ON public.quiz_questions FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

  DROP POLICY IF EXISTS "quiz_questions_update_own" ON public.quiz_questions;
  CREATE POLICY "quiz_questions_update_own" ON public.quiz_questions FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

  DROP POLICY IF EXISTS "quiz_questions_delete_own" ON public.quiz_questions;
  CREATE POLICY "quiz_questions_delete_own" ON public.quiz_questions FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));
END $$;

-- ==============================================================================
-- 10. SUPABASE STORAGE BUCKETS CONFIGURATION (schedules & documents)
-- ==============================================================================

-- Création sécurisée des buckets si l'extension storage existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('schedules', 'schedules', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('documents', 'documents', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- RLS sur storage.objects pour limiter l'accès à son propre répertoire user_id/*
DO $$ BEGIN
  DROP POLICY IF EXISTS "User can view own schedules" ON storage.objects;
  CREATE POLICY "User can view own schedules" ON storage.objects FOR SELECT
    USING (bucket_id = 'schedules' AND auth.uid()::text = (storage.foldername(name))[1]);

  DROP POLICY IF EXISTS "User can upload own schedules" ON storage.objects;
  CREATE POLICY "User can upload own schedules" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'schedules' AND auth.uid()::text = (storage.foldername(name))[1]);

  DROP POLICY IF EXISTS "User can delete own schedules" ON storage.objects;
  CREATE POLICY "User can delete own schedules" ON storage.objects FOR DELETE
    USING (bucket_id = 'schedules' AND auth.uid()::text = (storage.foldername(name))[1]);

  DROP POLICY IF EXISTS "User can view own documents" ON storage.objects;
  CREATE POLICY "User can view own documents" ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

  DROP POLICY IF EXISTS "User can upload own documents" ON storage.objects;
  CREATE POLICY "User can upload own documents" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

  DROP POLICY IF EXISTS "User can delete own documents" ON storage.objects;
  CREATE POLICY "User can delete own documents" ON storage.objects FOR DELETE
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
END $$;

-- 11. INDEXES POUR OPTIMISATION DES REQUÊTES
CREATE INDEX IF NOT EXISTS idx_schedule_entries_user_day ON public.schedule_entries(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_revision_slots_user_day ON public.revision_slots(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_doc ON public.flashcards(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_doc ON public.quizzes(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_user_completed ON public.pomodoro_sessions(user_id, completed_at DESC);
