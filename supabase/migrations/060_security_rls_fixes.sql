-- Fix overly permissive RLS on consentimiento_solicitudes
-- The old policy allowed anonymous users to read ALL patient consent records
-- New policy: only allow reading a specific row when the token in the URL matches

DROP POLICY IF EXISTS "public_token_read" ON consentimiento_solicitudes;

-- Anonymous access only when the row's token matches the requested token
-- The app sets app.public_token via set_config before querying
CREATE POLICY "public_token_read" ON consentimiento_solicitudes
  FOR SELECT TO anon
  USING (token = current_setting('app.public_token', true));

-- Also allow anon UPDATE (to save signature) only for matching token
DROP POLICY IF EXISTS "public_token_sign" ON consentimiento_solicitudes;
CREATE POLICY "public_token_sign" ON consentimiento_solicitudes
  FOR UPDATE TO anon
  USING (token = current_setting('app.public_token', true))
  WITH CHECK (token = current_setting('app.public_token', true));
