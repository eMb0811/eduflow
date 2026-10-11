-- Migration 0001: Initial Schema for EduFlow
-- Tables, Triggers, Row Level Security (RLS), and Storage Buckets

-- Enable UUID extension if needed
create extension if not exists "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. PROFILES TABLE & AUTH TRIGGER
--------------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  academic_level text,
  field_of_study text,
  academic_goals text,
  avatar_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Trigger function to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

--------------------------------------------------------------------------------
-- 2. SUBJECTS TABLE
--------------------------------------------------------------------------------

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#4F46E5',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

--------------------------------------------------------------------------------
-- 3. EXAMS TABLE
--------------------------------------------------------------------------------

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  exam_date timestamptz not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

--------------------------------------------------------------------------------
-- 4. SCHEDULE ENTRIES TABLE
--------------------------------------------------------------------------------

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text not null,
  day_of_week text not null check (day_of_week in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time text not null,
  end_time text not null,
  room text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

--------------------------------------------------------------------------------
-- 5. DOCUMENTS TABLE
--------------------------------------------------------------------------------

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  file_url text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

--------------------------------------------------------------------------------
-- 6. POMODORO SESSIONS TABLE
--------------------------------------------------------------------------------

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  duration_minutes integer not null,
  type text not null check (type in ('work', 'short_break', 'long_break')),
  completed_at timestamptz default timezone('utc'::text, now()) not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

--------------------------------------------------------------------------------
-- 7. CHAT MESSAGES TABLE
--------------------------------------------------------------------------------

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

--------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.exams enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.documents enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles policies (auth.uid() = id)
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Profiles can be inserted by owner" on public.profiles;
create policy "Profiles can be inserted by owner" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Profiles can be updated by owner" on public.profiles;
create policy "Profiles can be updated by owner" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Profiles can be deleted by owner" on public.profiles;
create policy "Profiles can be deleted by owner" on public.profiles
  for delete using (auth.uid() = id);

-- Subjects policies
drop policy if exists "Subjects viewable by owner" on public.subjects;
create policy "Subjects viewable by owner" on public.subjects
  for select using (auth.uid() = user_id);

drop policy if exists "Subjects insertable by owner" on public.subjects;
create policy "Subjects insertable by owner" on public.subjects
  for insert with check (auth.uid() = user_id);

drop policy if exists "Subjects updatable by owner" on public.subjects;
create policy "Subjects updatable by owner" on public.subjects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Subjects deletable by owner" on public.subjects;
create policy "Subjects deletable by owner" on public.subjects
  for delete using (auth.uid() = user_id);

-- Exams policies
drop policy if exists "Exams viewable by owner" on public.exams;
create policy "Exams viewable by owner" on public.exams
  for select using (auth.uid() = user_id);

drop policy if exists "Exams insertable by owner" on public.exams;
create policy "Exams insertable by owner" on public.exams
  for insert with check (auth.uid() = user_id);

drop policy if exists "Exams updatable by owner" on public.exams;
create policy "Exams updatable by owner" on public.exams
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Exams deletable by owner" on public.exams;
create policy "Exams deletable by owner" on public.exams
  for delete using (auth.uid() = user_id);

-- Schedule Entries policies
drop policy if exists "Schedule entries viewable by owner" on public.schedule_entries;
create policy "Schedule entries viewable by owner" on public.schedule_entries
  for select using (auth.uid() = user_id);

drop policy if exists "Schedule entries insertable by owner" on public.schedule_entries;
create policy "Schedule entries insertable by owner" on public.schedule_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "Schedule entries updatable by owner" on public.schedule_entries;
create policy "Schedule entries updatable by owner" on public.schedule_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Schedule entries deletable by owner" on public.schedule_entries;
create policy "Schedule entries deletable by owner" on public.schedule_entries
  for delete using (auth.uid() = user_id);

-- Documents policies
drop policy if exists "Documents viewable by owner" on public.documents;
create policy "Documents viewable by owner" on public.documents
  for select using (auth.uid() = user_id);

drop policy if exists "Documents insertable by owner" on public.documents;
create policy "Documents insertable by owner" on public.documents
  for insert with check (auth.uid() = user_id);

drop policy if exists "Documents updatable by owner" on public.documents;
create policy "Documents updatable by owner" on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Documents deletable by owner" on public.documents;
create policy "Documents deletable by owner" on public.documents
  for delete using (auth.uid() = user_id);

-- Pomodoro Sessions policies
drop policy if exists "Pomodoro sessions viewable by owner" on public.pomodoro_sessions;
create policy "Pomodoro sessions viewable by owner" on public.pomodoro_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "Pomodoro sessions insertable by owner" on public.pomodoro_sessions;
create policy "Pomodoro sessions insertable by owner" on public.pomodoro_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Pomodoro sessions updatable by owner" on public.pomodoro_sessions;
create policy "Pomodoro sessions updatable by owner" on public.pomodoro_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Pomodoro sessions deletable by owner" on public.pomodoro_sessions;
create policy "Pomodoro sessions deletable by owner" on public.pomodoro_sessions
  for delete using (auth.uid() = user_id);

-- Chat Messages policies
drop policy if exists "Chat messages viewable by owner" on public.chat_messages;
create policy "Chat messages viewable by owner" on public.chat_messages
  for select using (auth.uid() = user_id);

drop policy if exists "Chat messages insertable by owner" on public.chat_messages;
create policy "Chat messages insertable by owner" on public.chat_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "Chat messages updatable by owner" on public.chat_messages;
create policy "Chat messages updatable by owner" on public.chat_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Chat messages deletable by owner" on public.chat_messages;
create policy "Chat messages deletable by owner" on public.chat_messages
  for delete using (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- 9. STORAGE BUCKETS & STORAGE POLICIES
--------------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('schedules', 'schedules', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Schedules Bucket Policies (path prefix = {user_id}/...)
drop policy if exists "Users can access own schedule files" on storage.objects;
create policy "Users can access own schedule files" on storage.objects
  for select using (bucket_id = 'schedules' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can upload own schedule files" on storage.objects;
create policy "Users can upload own schedule files" on storage.objects
  for insert with check (bucket_id = 'schedules' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own schedule files" on storage.objects;
create policy "Users can update own schedule files" on storage.objects
  for update using (bucket_id = 'schedules' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own schedule files" on storage.objects;
create policy "Users can delete own schedule files" on storage.objects
  for delete using (bucket_id = 'schedules' and auth.uid()::text = (storage.foldername(name))[1]);

-- Documents Bucket Policies (path prefix = {user_id}/...)
drop policy if exists "Users can access own documents" on storage.objects;
create policy "Users can access own documents" on storage.objects
  for select using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can upload own documents" on storage.objects;
create policy "Users can upload own documents" on storage.objects
  for insert with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own documents" on storage.objects;
create policy "Users can update own documents" on storage.objects
  for update using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own documents" on storage.objects;
create policy "Users can delete own documents" on storage.objects
  for delete using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
