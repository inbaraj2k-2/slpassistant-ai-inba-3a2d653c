DROP POLICY IF EXISTS "Therapy goals are publicly readable" ON public.therapy_goals;
REVOKE SELECT ON public.therapy_goals FROM anon;
CREATE POLICY "Therapy goals readable by authenticated users"
  ON public.therapy_goals FOR SELECT TO authenticated USING (true);