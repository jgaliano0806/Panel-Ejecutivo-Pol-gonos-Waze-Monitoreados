-- ===========================================
-- Ampliar accident_media para soportar documentos (PDF, DOC, XLS)
-- ===========================================

-- Eliminar constraint existente de file_type y reemplazarla
ALTER TABLE accident_media
  DROP CONSTRAINT IF EXISTS accident_media_file_type_check;

ALTER TABLE accident_media
  ADD CONSTRAINT accident_media_file_type_check
  CHECK (file_type IN ('image', 'video', 'document'));
