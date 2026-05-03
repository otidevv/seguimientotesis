-- CreateTable
CREATE TABLE "public"."thesis_deadline_extensions" (
    "id" TEXT NOT NULL,
    "thesis_id" TEXT NOT NULL,
    "ronda" INTEGER NOT NULL,
    "solicitante_id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "dias_extendidos" INTEGER NOT NULL DEFAULT 30,
    "fecha_limite_anterior" TIMESTAMP(3) NOT NULL,
    "fecha_limite_nueva" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_deadline_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thesis_deadline_extensions_created_at_idx" ON "public"."thesis_deadline_extensions"("created_at" ASC);

-- CreateIndex
CREATE INDEX "thesis_deadline_extensions_thesis_id_idx" ON "public"."thesis_deadline_extensions"("thesis_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "thesis_deadline_extensions_thesis_id_ronda_key" ON "public"."thesis_deadline_extensions"("thesis_id" ASC, "ronda" ASC);

-- AddForeignKey
ALTER TABLE "public"."thesis_deadline_extensions" ADD CONSTRAINT "thesis_deadline_extensions_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "public"."thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."thesis_deadline_extensions" ADD CONSTRAINT "thesis_deadline_extensions_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
