
-- Add avatar_path column to profiles (stores the object key in the `uploads` bucket)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Allow owners to manage their own avatar objects under `avatars/{auth.uid()}/...` in the `uploads` bucket
DO $$ BEGIN
  CREATE POLICY "Users manage own avatar objects (select)" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own avatar objects (insert)" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own avatar objects (update)" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own avatar objects (delete)" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
