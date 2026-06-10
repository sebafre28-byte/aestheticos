-- Estados adicionales para el agente IA de WhatsApp:
-- - conversaciones.estado = 'humano' (escalada por el agente, el bot no responde)
-- - mensajes_inbox.estado_whatsapp = 'recibido' (mensajes entrantes de media)

ALTER TABLE conversaciones DROP CONSTRAINT IF EXISTS conversaciones_estado_check;
ALTER TABLE conversaciones ADD CONSTRAINT conversaciones_estado_check
  CHECK (estado IN ('activa', 'archivada', 'spam', 'humano'));

ALTER TABLE mensajes_inbox DROP CONSTRAINT IF EXISTS mensajes_inbox_estado_check;
ALTER TABLE mensajes_inbox ADD CONSTRAINT mensajes_inbox_estado_check
  CHECK (estado_whatsapp IN ('pendiente', 'enviado', 'entregado', 'leido', 'fallido', 'recibido'));
