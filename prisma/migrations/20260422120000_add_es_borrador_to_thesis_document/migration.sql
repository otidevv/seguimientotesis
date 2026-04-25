-- AlterTable: agregar flag es_borrador para documentos subidos pero no registrados/firmados aun.
-- Documentos "borrador" persisten la subida (archivo + metadatos) entre sesiones
-- y dispositivos, pero no aparecen como version actual hasta que se registran o firman.
ALTER TABLE "thesis_documents"
  ADD COLUMN "es_borrador" BOOLEAN NOT NULL DEFAULT FALSE;

-- Indice para lookup rapido del borrador pendiente de un usuario en una tesis.
CREATE INDEX "thesis_documents_borrador_lookup_idx"
  ON "thesis_documents" ("thesis_id", "uploaded_by_id", "tipo")
  WHERE "es_borrador" = TRUE;
