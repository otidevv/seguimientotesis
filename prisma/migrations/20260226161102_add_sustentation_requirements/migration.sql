/*
  Warnings:

  - You are about to drop the column `semestre_actual` on the `student_careers` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "tipo_documento_tesis" ADD VALUE 'VOUCHER_SALA_GRADOS';
ALTER TYPE "tipo_documento_tesis" ADD VALUE 'VOUCHER_SUSTENTACION';
ALTER TYPE "tipo_documento_tesis" ADD VALUE 'CONSTANCIA_SUNEDU';
ALTER TYPE "tipo_documento_tesis" ADD VALUE 'RESOLUCION_SUSTENTACION';

-- AlterTable
ALTER TABLE "student_careers" DROP COLUMN "semestre_actual";

-- AlterTable
ALTER TABLE "thesis" ADD COLUMN     "constancia_sunedu_entregada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "constancia_sunedu_entregada_fecha" TIMESTAMP(3),
ADD COLUMN     "ejemplares_entregados" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ejemplares_entregados_fecha" TIMESTAMP(3),
ADD COLUMN     "voucher_sustentacion_fisico_entregado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voucher_sustentacion_fisico_fecha" TIMESTAMP(3);
