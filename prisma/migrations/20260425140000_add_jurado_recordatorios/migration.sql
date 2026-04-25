-- CreateEnum
CREATE TYPE "fase_recordatorio_jurado" AS ENUM ('DOS_DIAS_ANTES', 'DIA_LIMITE');

-- CreateTable
CREATE TABLE "jurado_recordatorios" (
    "id" TEXT NOT NULL,
    "jury_member_id" TEXT NOT NULL,
    "ronda" INTEGER NOT NULL,
    "fase" "fase_recordatorio_jurado" NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jurado_recordatorios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jurado_recordatorios_jury_member_id_idx" ON "jurado_recordatorios"("jury_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "jurado_recordatorios_jury_member_id_ronda_fase_key" ON "jurado_recordatorios"("jury_member_id", "ronda", "fase");

-- AddForeignKey
ALTER TABLE "jurado_recordatorios" ADD CONSTRAINT "jurado_recordatorios_jury_member_id_fkey" FOREIGN KEY ("jury_member_id") REFERENCES "thesis_jury"("id") ON DELETE CASCADE ON UPDATE CASCADE;
