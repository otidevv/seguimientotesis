-- CreateEnum
CREATE TYPE "estado_autor" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');

-- AlterTable
ALTER TABLE "thesis_authors" ADD COLUMN     "estado" "estado_autor" NOT NULL DEFAULT 'ACEPTADO',
ADD COLUMN     "fecha_respuesta" TIMESTAMP(3),
ADD COLUMN     "motivo_rechazo" TEXT;
