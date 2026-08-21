-- Veyvio shared identity: add the company applications governed by Executive.
-- Kept separate because PostgreSQL enum values must be committed before use.

alter type public.app_type add value if not exists 'EXECUTIVE';
alter type public.app_type add value if not exists 'FINANCE';
alter type public.app_type add value if not exists 'HR';

alter type public.source_app add value if not exists 'EXECUTIVE';
alter type public.source_app add value if not exists 'FINANCE';
alter type public.source_app add value if not exists 'HR';
