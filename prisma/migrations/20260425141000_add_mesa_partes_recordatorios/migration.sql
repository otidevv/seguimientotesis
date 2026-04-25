-- CreateTable
CREATE TABLE "mesa_partes_recordatorios" (
    "id" TEXT NOT NULL,
    "thesis_id" TEXT NOT NULL,
    "ronda" INTEGER NOT NULL,
    "fase" "fase_recordatorio_jurado" NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mesa_partes_recordatorios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mesa_partes_recordatorios_thesis_id_idx" ON "mesa_partes_recordatorios"("thesis_id");

-- CreateIndex
CREATE UNIQUE INDEX "mesa_partes_recordatorios_thesis_id_ronda_fase_key" ON "mesa_partes_recordatorios"("thesis_id", "ronda", "fase");

-- AddForeignKey
ALTER TABLE "mesa_partes_recordatorios" ADD CONSTRAINT "mesa_partes_recordatorios_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
