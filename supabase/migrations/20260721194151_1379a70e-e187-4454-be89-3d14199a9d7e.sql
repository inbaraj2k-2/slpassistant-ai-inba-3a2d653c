ALTER TABLE public.aac_vocabulary ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS aac_vocabulary_user_sort_idx ON public.aac_vocabulary(user_id, sort_order);