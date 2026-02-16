-- CreateEnum
CREATE TYPE "modalidad_sustentacion" AS ENUM ('PRESENCIAL', 'VIRTUAL', 'MIXTA');

-- AlterTable
ALTER TABLE "thesis" ADD COLUMN     "lugar_sustentacion" VARCHAR(300),
ADD COLUMN     "modalidad_sustentacion" "modalidad_sustentacion";
