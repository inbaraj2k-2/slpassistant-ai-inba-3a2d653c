
ALTER TABLE public.disorders ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.disorders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS disorders_parent_id_idx ON public.disorders(parent_id);

INSERT INTO public.disorders (name, category)
VALUES ('Apraxia of Speech', 'Motor Speech Disorders')
ON CONFLICT (name) DO NOTHING;

UPDATE public.disorders
SET parent_id = (SELECT id FROM public.disorders WHERE name = 'Apraxia of Speech')
WHERE name IN (
  'Childhood Apraxia of Speech',
  'Acquired Apraxia of Speech',
  'Verbal Apraxia',
  'Developmental Verbal Dyspraxia',
  'Dyspraxia of Speech'
);
