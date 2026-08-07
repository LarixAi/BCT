-- Link Incoming Interests accept/reject outcomes to operational records.
alter table public.interest_submissions
  add column if not exists converted_booking_id uuid references public.bookings (id) on delete set null,
  add column if not exists converted_trip_id uuid references public.trips (id) on delete set null,
  add column if not exists rejection_notified_at timestamptz;

create index if not exists interest_submissions_converted_trip_idx
  on public.interest_submissions (company_id, converted_trip_id)
  where converted_trip_id is not null;
