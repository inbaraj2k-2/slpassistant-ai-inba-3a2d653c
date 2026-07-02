-- user_uploads table
CREATE TABLE public.user_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_uploads TO authenticated;
GRANT ALL ON public.user_uploads TO service_role;

ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own uploads (select)" ON public.user_uploads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own uploads (insert)" ON public.user_uploads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own uploads (update)" ON public.user_uploads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own uploads (delete)" ON public.user_uploads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage RLS: files scoped by user_id folder prefix in `uploads` bucket
CREATE POLICY "Users can read own upload files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own upload files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own upload files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
