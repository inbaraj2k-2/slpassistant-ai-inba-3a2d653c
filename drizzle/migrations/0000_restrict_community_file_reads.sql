DROP POLICY IF EXISTS "Authenticated can read community files" ON storage.objects;
CREATE POLICY "Read own or published community files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = 'community'
    AND (
      (storage.foldername(name))[2] = (select auth.uid()::text)
      OR EXISTS (
        SELECT 1 FROM public.community_uploads cu
        WHERE cu.file_path = storage.objects.name AND cu.is_public = true
      )
    )
  );