
-- Server-side validation for community uploads: enforce allowed extensions/mimetypes
-- and max file size against storage.objects metadata to prevent client-side bypass.

CREATE OR REPLACE FUNCTION public.validate_community_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  obj_size bigint;
  obj_mime text;
  allowed_exts text[] := ARRAY['pdf','docx','jpg','jpeg','png'];
  allowed_mimes text[] := ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ];
  max_bytes bigint := 25 * 1024 * 1024; -- 25MB cap for public community files
BEGIN
  IF NEW.file_type IS NULL OR NOT (lower(NEW.file_type) = ANY(allowed_exts)) THEN
    RAISE EXCEPTION 'File type % not allowed for community uploads', NEW.file_type
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT (metadata->>'size')::bigint, metadata->>'mimetype'
    INTO obj_size, obj_mime
  FROM storage.objects
  WHERE bucket_id = 'uploads' AND name = NEW.file_path
  LIMIT 1;

  IF obj_size IS NULL THEN
    RAISE EXCEPTION 'Referenced storage object not found'
      USING ERRCODE = 'check_violation';
  END IF;

  IF obj_size > max_bytes THEN
    RAISE EXCEPTION 'File exceeds max size of 25MB'
      USING ERRCODE = 'check_violation';
  END IF;

  IF obj_mime IS NULL OR NOT (lower(obj_mime) = ANY(allowed_mimes)) THEN
    RAISE EXCEPTION 'Mime type % not allowed for community uploads', obj_mime
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_uploads_validate ON public.community_uploads;
CREATE TRIGGER community_uploads_validate
BEFORE INSERT OR UPDATE ON public.community_uploads
FOR EACH ROW EXECUTE FUNCTION public.validate_community_upload();
