-- Bucket público para logos de clínicas
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Subir: solo usuarios autenticados
CREATE POLICY "logos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

-- Leer: público
CREATE POLICY "logos_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

-- Actualizar: solo usuarios autenticados
CREATE POLICY "logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos');

-- Eliminar: solo usuarios autenticados
CREATE POLICY "logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos');
