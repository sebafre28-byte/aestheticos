-- Permite a miembros invitados (coordinador/profesional) leer los datos de su clínica.
-- La política existente clinicas_owner (owner_id = auth.uid()) solo cubre al dueño.
-- Esta política adicional cubre SELECT para cualquier usuario cuyo auth_clinica_id() sea este id.

CREATE POLICY clinicas_miembro_select
ON clinicas FOR SELECT
USING (id = auth_clinica_id());
