-- Políticas de Storage para buckets logos y profesionales
-- Ejecutar en Supabase SQL Editor

-- ─── Bucket: logos ────────────────────────────────────────────────────────────
-- Lectura pública (cualquiera puede ver logos)
DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Subida solo para usuarios autenticados (dueños de la clínica)
DROP POLICY IF EXISTS "logos_auth_insert" ON storage.objects;
CREATE POLICY "logos_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "logos_auth_update" ON storage.objects;
CREATE POLICY "logos_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "logos_auth_delete" ON storage.objects;
CREATE POLICY "logos_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- ─── Bucket: profesionales ────────────────────────────────────────────────────
-- Lectura pública (fotos visibles en el book público)
DROP POLICY IF EXISTS "profesionales_public_read" ON storage.objects;
CREATE POLICY "profesionales_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'profesionales');

-- Subida solo para usuarios autenticados
DROP POLICY IF EXISTS "profesionales_auth_insert" ON storage.objects;
CREATE POLICY "profesionales_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profesionales' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profesionales_auth_update" ON storage.objects;
CREATE POLICY "profesionales_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profesionales' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profesionales_auth_delete" ON storage.objects;
CREATE POLICY "profesionales_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'profesionales' AND auth.role() = 'authenticated');
