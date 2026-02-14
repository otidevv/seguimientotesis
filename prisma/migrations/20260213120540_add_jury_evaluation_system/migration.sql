-- CreateEnum
CREATE TYPE "tipo_jurado" AS ENUM ('PRESIDENTE', 'VOCAL', 'SECRETARIO', 'ACCESITARIO');

-- CreateEnum
CREATE TYPE "resultado_evaluacion" AS ENUM ('APROBADO', 'OBSERVADO');

-- CreateEnum
CREATE TYPE "fase_evaluacion" AS ENUM ('PROYECTO', 'INFORME_FINAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "estado_tesis" ADD VALUE 'ASIGNANDO_JURADOS';
ALTER TYPE "estado_tesis" ADD VALUE 'EN_EVALUACION_JURADO';
ALTER TYPE "estado_tesis" ADD VALUE 'OBSERVADA_JURADO';
ALTER TYPE "estado_tesis" ADD VALUE 'PROYECTO_APROBADO';
ALTER TYPE "estado_tesis" ADD VALUE 'INFORME_FINAL';
ALTER TYPE "estado_tesis" ADD VALUE 'EN_EVALUACION_INFORME';
ALTER TYPE "estado_tesis" ADD VALUE 'OBSERVADA_INFORME';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "tipo_documento_tesis" ADD VALUE 'DICTAMEN_JURADO';
ALTER TYPE "tipo_documento_tesis" ADD VALUE 'RESOLUCION_APROBACION';
ALTER TYPE "tipo_documento_tesis" ADD VALUE 'REPORTE_TURNITIN';
ALTER TYPE "tipo_documento_tesis" ADD VALUE 'INFORME_FINAL_DOC';

-- AlterTable
ALTER TABLE "thesis" ADD COLUMN     "fase_actual" VARCHAR(20),
ADD COLUMN     "fecha_limite_correccion" TIMESTAMP(3),
ADD COLUMN     "fecha_limite_evaluacion" TIMESTAMP(3),
ADD COLUMN     "ronda_actual" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "thesis_jury" (
    "id" TEXT NOT NULL,
    "thesis_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" "tipo_jurado" NOT NULL,
    "fase" "fase_evaluacion" NOT NULL DEFAULT 'PROYECTO',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thesis_jury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jury_evaluations" (
    "id" TEXT NOT NULL,
    "thesis_id" TEXT NOT NULL,
    "jury_member_id" TEXT NOT NULL,
    "ronda" INTEGER NOT NULL DEFAULT 1,
    "resultado" "resultado_evaluacion" NOT NULL,
    "observaciones" TEXT,
    "archivo_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jury_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thesis_jury_thesis_id_idx" ON "thesis_jury"("thesis_id");

-- CreateIndex
CREATE INDEX "thesis_jury_user_id_idx" ON "thesis_jury"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "thesis_jury_thesis_id_user_id_fase_key" ON "thesis_jury"("thesis_id", "user_id", "fase");

-- CreateIndex
CREATE INDEX "jury_evaluations_thesis_id_idx" ON "jury_evaluations"("thesis_id");

-- CreateIndex
CREATE INDEX "jury_evaluations_jury_member_id_idx" ON "jury_evaluations"("jury_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "jury_evaluations_jury_member_id_ronda_key" ON "jury_evaluations"("jury_member_id", "ronda");

-- AddForeignKey
ALTER TABLE "thesis_jury" ADD CONSTRAINT "thesis_jury_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_jury" ADD CONSTRAINT "thesis_jury_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jury_evaluations" ADD CONSTRAINT "jury_evaluations_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jury_evaluations" ADD CONSTRAINT "jury_evaluations_jury_member_id_fkey" FOREIGN KEY ("jury_member_id") REFERENCES "thesis_jury"("id") ON DELETE CASCADE ON UPDATE CASCADE;
