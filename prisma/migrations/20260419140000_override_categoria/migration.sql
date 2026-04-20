-- CreateEnum
CREATE TYPE "override_categoria" AS ENUM ('CASO_FORTUITO', 'FUERZA_MAYOR', 'ERROR_ADMINISTRATIVO', 'REPRESENTANTE_OFICIAL', 'OTRO');

-- AlterTable: agregar categoria + updated_at al override.
-- updated_at con default now() para no fallar en filas existentes; Prisma lo
-- mantiene actualizado via @updatedAt.
ALTER TABLE "academic_window_overrides"
  ADD COLUMN "categoria" "override_categoria" NOT NULL DEFAULT 'OTRO',
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
