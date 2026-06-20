-- Eliminar tabla deprecada mensajes_whatsapp.
-- Fue reemplazada por mensajes_inbox en 005_whatsapp_inbox.sql.
-- Verificado: ninguna referencia en el código de aplicación.
DROP TABLE IF EXISTS mensajes_whatsapp;
