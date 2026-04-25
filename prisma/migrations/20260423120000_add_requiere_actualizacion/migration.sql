-- AlterTable: flag de "documento vigente pero obsoleto por cambio de contexto".
-- Se usa para cartas de aceptación cuando cambia la composición de autores:
-- la carta firmada sigue siendo la versión actual y queda visible, pero con
-- badge de "desactualizada" hasta que el asesor suba una nueva versión.
ALTER TABLE "thesis_documents"
  ADD COLUMN "requiere_actualizacion" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "motivo_actualizacion" TEXT;
