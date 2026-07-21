-- Lesson progress + assignment metadata for Driver Training Centre.

alter table public.driver_training
  add column if not exists progress_percentage integer not null default 0,
  add column if not exists lesson_progress jsonb not null default '{}'::jsonb,
  add column if not exists started_at timestamptz,
  add column if not exists due_at date,
  add column if not exists assigned_at timestamptz,
  add column if not exists assigned_by_name text,
  add column if not exists eligibility_effect text not null default 'none',
  add column if not exists restricted_work_types text[] not null default '{}',
  add column if not exists declaration_at timestamptz,
  add column if not exists assessment_score numeric,
  add column if not exists course_version text not null default '1.0';

comment on column public.driver_training.lesson_progress is
  'JSON map of lessonId -> { completedAt, acknowledgedAt, answers }';
comment on column public.driver_training.eligibility_effect is
  'none | warning | block_specific_work | block_all_work';
