alter table public.profiles
  add column if not exists clinic_name text;

alter table public.profiles
  add column if not exists clinic_logo_url text;
