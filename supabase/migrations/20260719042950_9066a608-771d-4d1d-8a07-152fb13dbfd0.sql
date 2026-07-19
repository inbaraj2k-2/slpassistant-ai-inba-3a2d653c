ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS clinic_name text,
  ADD COLUMN IF NOT EXISTS clinic_logo_url text;