-- Driver profile photos (Command upload; Driver/Yard read via signed URLs).
-- Stored in private bucket `driver-documents` under tenant path …/drivers/{id}/profile/.

alter table public.drivers
  add column if not exists profile_photo_storage_key text,
  add column if not exists profile_photo_file_object_id uuid references public.file_objects (id) on delete set null,
  add column if not exists profile_photo_updated_at timestamptz;

comment on column public.drivers.profile_photo_storage_key is
  'Tenant-scoped storage key in driver-documents for the driver profile photo';
comment on column public.drivers.profile_photo_file_object_id is
  'Optional file_objects row for the current profile photo';
