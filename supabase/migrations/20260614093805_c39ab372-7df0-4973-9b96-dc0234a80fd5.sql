CREATE TABLE public.disorders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text,
  symptoms text,
  red_flags text,
  source_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.disorders TO anon, authenticated;
GRANT ALL ON public.disorders TO service_role;
ALTER TABLE public.disorders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Disorders are publicly readable" ON public.disorders FOR SELECT USING (true);

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disorder_id uuid NOT NULL REFERENCES public.disorders(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessments_disorder_id_idx ON public.assessments(disorder_id);
GRANT SELECT ON public.assessments TO anon, authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assessments are publicly readable" ON public.assessments FOR SELECT USING (true);

CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disorder_id uuid NOT NULL REFERENCES public.disorders(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX materials_disorder_id_idx ON public.materials(disorder_id);
GRANT SELECT ON public.materials TO anon, authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materials are publicly readable" ON public.materials FOR SELECT USING (true);

CREATE TABLE public.therapy_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disorder_id uuid NOT NULL REFERENCES public.disorders(id) ON DELETE CASCADE,
  goal text NOT NULL,
  source_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX therapy_goals_disorder_id_idx ON public.therapy_goals(disorder_id);
GRANT SELECT ON public.therapy_goals TO anon, authenticated;
GRANT ALL ON public.therapy_goals TO service_role;
ALTER TABLE public.therapy_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Therapy goals are publicly readable" ON public.therapy_goals FOR SELECT USING (true);

CREATE TABLE public.clinical_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disorder_id uuid REFERENCES public.disorders(id) ON DELETE CASCADE,
  disorder_name text NOT NULL,
  primary_source text,
  secondary_source text,
  verification_status text,
  kind text NOT NULL CHECK (kind IN ('mapping','verification')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinical_sources_disorder_id_idx ON public.clinical_sources(disorder_id);
GRANT SELECT ON public.clinical_sources TO anon, authenticated;
GRANT ALL ON public.clinical_sources TO service_role;
ALTER TABLE public.clinical_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinical sources are publicly readable" ON public.clinical_sources FOR SELECT USING (true);

CREATE TRIGGER update_disorders_updated_at BEFORE UPDATE ON public.disorders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();