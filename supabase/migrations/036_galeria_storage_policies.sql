-- Bucket galeria-clinica debe crearse manualmente en Supabase Storage (privado)
-- Estas policies asumen que el bucket ya existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'galeria-clinica'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('galeria-clinica', 'galeria-clinica', false);
  END IF;
END $$;

DROP POLICY IF EXISTS "galeria_clinica_insert" ON storage.objects;
DROP POLICY IF EXISTS "galeria_clinica_select" ON storage.objects;
DROP POLICY IF EXISTS "galeria_clinica_delete" ON storage.objects;

CREATE POLICY "galeria_clinica_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'galeria-clinica' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "galeria_clinica_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'galeria-clinica' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "galeria_clinica_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'galeria-clinica' AND auth.uid() IS NOT NULL
  );
