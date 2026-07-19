-- Allow anonymous read access to therapy_goals so the offline snapshot
-- and public Knowledge Base browsing work without authentication.
-- This is public clinical reference data, safe to read anonymously.
GRANT SELECT ON public.therapy_goals TO anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'therapy_goals'
      AND policyname = 'Anyone can read therapy goals'
  ) THEN
    CREATE POLICY "Anyone can read therapy goals"
      ON public.therapy_goals
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;