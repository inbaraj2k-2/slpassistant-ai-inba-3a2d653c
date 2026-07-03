
CREATE TABLE public.community_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_uploads TO authenticated;
GRANT ALL ON public.community_uploads TO service_role;

ALTER TABLE public.community_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view public community uploads"
  ON public.community_uploads FOR SELECT
  TO authenticated
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own community uploads"
  ON public.community_uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own community uploads"
  ON public.community_uploads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own community uploads"
  ON public.community_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_community_uploads_updated_at
  BEFORE UPDATE ON public.community_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX community_uploads_created_at_idx ON public.community_uploads (created_at DESC);
CREATE INDEX community_uploads_category_idx ON public.community_uploads (category);
CREATE INDEX community_uploads_user_id_idx ON public.community_uploads (user_id);

-- Storage policies for shared community files in the 'uploads' bucket under 'community/' prefix
CREATE POLICY "Authenticated can read community files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = 'community');

CREATE POLICY "Users can upload their community files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = 'community'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete their community files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = 'community'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
