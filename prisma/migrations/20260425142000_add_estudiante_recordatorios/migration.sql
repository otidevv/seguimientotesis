-- CreateTable
CREATE TABLE "estudiante_recordatorios" (
    "id" TEXT NOT NULL,
    "thesis_author_id" TEXT NOT NULL,
    "ronda" INTEGER NOT NULL,
    "fase" "fase_recordatorio_jurado" NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estudiante_recordatorios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estudiante_recordatorios_thesis_author_id_idx" ON "estudiante_recordatorios"("thesis_author_id");

-- CreateIndex
CREATE UNIQUE INDEX "estudiante_recordatorios_thesis_author_id_ronda_fase_key" ON "estudiante_recordatorios"("thesis_author_id", "ronda", "fase");

-- AddForeignKey
ALTER TABLE "estudiante_recordatorios" ADD CONSTRAINT "estudiante_recordatorios_thesis_author_id_fkey" FOREIGN KEY ("thesis_author_id") REFERENCES "thesis_authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
