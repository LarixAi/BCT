-- Track when a yard manager starts work on a task (progress sync between Command and Yard).

alter table public.yard_tasks
  add column if not exists started_at timestamptz;
