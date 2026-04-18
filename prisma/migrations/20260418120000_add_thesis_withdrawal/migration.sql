-- AlterEnum: añadir SOLICITUD_DESISTIMIENTO al enum estado_tesis
ALTER TYPE "estado_tesis" ADD VALUE IF NOT EXISTS 'SOLICITUD_DESISTIMIENTO';

-- CreateEnum: motivo_desistimiento
DO $$ BEGIN
  CREATE TYPE "motivo_desistimiento" AS ENUM (
    'PERSONAL_FAMILIAR','ECONOMICO','SALUD','LABORAL','CAMBIO_TEMA',
    'PROBLEMA_ASESOR','PROBLEMA_COAUTOR','FALTA_TIEMPO','CAMBIO_CARRERA','OTRO'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum: estado_solicitud_desistimiento
DO $$ BEGIN
  CREATE TYPE "estado_solicitud_desistimiento" AS ENUM (
    'PENDIENTE','APROBADO','RECHAZADO','CANCELADO'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AlterTable: thesis_documents
ALTER TABLE "thesis_documents"
  ADD COLUMN IF NOT EXISTS "es_modificatoria" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reemplaza_documento_id" TEXT;

ALTER TABLE "thesis_documents"
  DROP CONSTRAINT IF EXISTS "thesis_documents_reemplaza_documento_id_fkey",
  ADD CONSTRAINT "thesis_documents_reemplaza_documento_id_fkey"
    FOREIGN KEY ("reemplaza_documento_id") REFERENCES "thesis_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: thesis_withdrawals
CREATE TABLE IF NOT EXISTS "thesis_withdrawals" (
  "id" TEXT NOT NULL,
  "thesis_id" TEXT NOT NULL,
  "thesis_author_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "student_career_id" TEXT NOT NULL,
  "motivo_categoria" "motivo_desistimiento" NOT NULL,
  "motivo_descripcion" TEXT NOT NULL,
  "estado_solicitud" "estado_solicitud_desistimiento" NOT NULL DEFAULT 'PENDIENTE',
  "solicitado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aprobado_por_id" TEXT,
  "aprobado_at" TIMESTAMP(3),
  "motivo_rechazo_mesa_partes" TEXT,
  "resolucion_documento_id" TEXT,
  "estado_tesis_al_solicitar" "estado_tesis" NOT NULL,
  "fase_actual" VARCHAR(20),
  "tenia_coautor" BOOLEAN NOT NULL,
  "facultad_id_snapshot" TEXT NOT NULL,
  "carrera_nombre_snapshot" VARCHAR(150) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "thesis_withdrawals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "thesis_withdrawals_thesis_author_id_key"
  ON "thesis_withdrawals"("thesis_author_id");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_user_id_idx" ON "thesis_withdrawals"("user_id");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_thesis_id_idx" ON "thesis_withdrawals"("thesis_id");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_estado_solicitud_idx" ON "thesis_withdrawals"("estado_solicitud");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_motivo_categoria_idx" ON "thesis_withdrawals"("motivo_categoria");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_created_at_idx" ON "thesis_withdrawals"("created_at");
CREATE INDEX IF NOT EXISTS "thesis_withdrawals_facultad_id_snapshot_idx" ON "thesis_withdrawals"("facultad_id_snapshot");

ALTER TABLE "thesis_withdrawals"
  DROP CONSTRAINT IF EXISTS "thesis_withdrawals_thesis_id_fkey",
  DROP CONSTRAINT IF EXISTS "thesis_withdrawals_thesis_author_id_fkey",
  DROP CONSTRAINT IF EXISTS "thesis_withdrawals_user_id_fkey",
  DROP CONSTRAINT IF EXISTS "thesis_withdrawals_aprobado_por_id_fkey",
  DROP CONSTRAINT IF EXISTS "thesis_withdrawals_resolucion_documento_id_fkey",
  DROP CONSTRAINT IF EXISTS "thesis_withdrawals_student_career_id_fkey",
  DROP CONSTRAINT IF EXISTS "thesis_withdrawals_facultad_id_snapshot_fkey",
  ADD CONSTRAINT "thesis_withdrawals_thesis_id_fkey"
    FOREIGN KEY ("thesis_id") REFERENCES "thesis"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "thesis_withdrawals_thesis_author_id_fkey"
    FOREIGN KEY ("thesis_author_id") REFERENCES "thesis_authors"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "thesis_withdrawals_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "thesis_withdrawals_aprobado_por_id_fkey"
    FOREIGN KEY ("aprobado_por_id") REFERENCES "users"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "thesis_withdrawals_resolucion_documento_id_fkey"
    FOREIGN KEY ("resolucion_documento_id") REFERENCES "thesis_documents"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "thesis_withdrawals_student_career_id_fkey"
    FOREIGN KEY ("student_career_id") REFERENCES "student_careers"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "thesis_withdrawals_facultad_id_snapshot_fkey"
    FOREIGN KEY ("facultad_id_snapshot") REFERENCES "faculties"("id") ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "thesis_withdrawals_aprobado_at_idx" ON "thesis_withdrawals"("aprobado_at");
