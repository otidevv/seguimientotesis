-- CreateEnum
CREATE TYPE "estado_asesor" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "tipo_documento_tesis" ADD VALUE 'CARTA_ACEPTACION_ASESOR';
ALTER TYPE "tipo_documento_tesis" ADD VALUE 'CARTA_ACEPTACION_COASESOR';

-- AlterTable
ALTER TABLE "thesis_advisors" ADD COLUMN     "estado" "estado_asesor" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "fecha_respuesta" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "thesis_documents" ADD COLUMN     "es_version_actual" BOOLEAN NOT NULL DEFAULT true;
