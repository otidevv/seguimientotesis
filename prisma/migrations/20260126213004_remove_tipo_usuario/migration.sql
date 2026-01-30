/*
  Warnings:

  - You are about to drop the column `tipo_usuario` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "estado_tesis" AS ENUM ('BORRADOR', 'EN_REVISION', 'OBSERVADA', 'APROBADA', 'EN_SUSTENTACION', 'SUSTENTADA', 'ARCHIVADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "tipo_asesor" AS ENUM ('PRINCIPAL', 'CO_ASESOR');

-- CreateEnum
CREATE TYPE "tipo_documento_tesis" AS ENUM ('PROYECTO', 'BORRADOR', 'DOCUMENTO_FINAL', 'ACTA_SUSTENTACION', 'CERTIFICADO', 'ANEXO', 'OTRO');

-- DropIndex
DROP INDEX "users_tipo_usuario_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "tipo_usuario",
ADD COLUMN     "avatar_url" VARCHAR(255),
ADD COLUMN     "telefono" VARCHAR(20);

-- DropEnum
DROP TYPE "tipo_usuario";

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(100) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis" (
    "id" TEXT NOT NULL,
    "titulo" VARCHAR(500) NOT NULL,
    "resumen" TEXT,
    "palabras_clave" TEXT[],
    "estado" "estado_tesis" NOT NULL DEFAULT 'BORRADOR',
    "fecha_inicio" TIMESTAMP(3),
    "fecha_aprobacion" TIMESTAMP(3),
    "fecha_sustentacion" TIMESTAMP(3),
    "linea_investigacion" VARCHAR(200),
    "area_conocimiento" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "thesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_authors" (
    "id" TEXT NOT NULL,
    "thesis_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "student_career_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_advisors" (
    "id" TEXT NOT NULL,
    "thesis_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" "tipo_asesor" NOT NULL DEFAULT 'PRINCIPAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_advisors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_documents" (
    "id" TEXT NOT NULL,
    "thesis_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "tipo" "tipo_documento_tesis" NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "descripcion" TEXT,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100),
    "tamano" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "firmado_digitalmente" BOOLEAN NOT NULL DEFAULT false,
    "fecha_firma" TIMESTAMP(3),
    "hash_documento" VARCHAR(128),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thesis_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_status_history" (
    "id" TEXT NOT NULL,
    "thesis_id" TEXT NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "estado_anterior" "estado_tesis",
    "estado_nuevo" "estado_tesis" NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_key" ON "email_verifications"("token");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_hash_key" ON "email_verifications"("token_hash");

-- CreateIndex
CREATE INDEX "email_verifications_user_id_idx" ON "email_verifications"("user_id");

-- CreateIndex
CREATE INDEX "email_verifications_token_hash_idx" ON "email_verifications"("token_hash");

-- CreateIndex
CREATE INDEX "thesis_estado_idx" ON "thesis"("estado");

-- CreateIndex
CREATE INDEX "thesis_created_at_idx" ON "thesis"("created_at");

-- CreateIndex
CREATE INDEX "thesis_authors_thesis_id_idx" ON "thesis_authors"("thesis_id");

-- CreateIndex
CREATE INDEX "thesis_authors_user_id_idx" ON "thesis_authors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "thesis_authors_thesis_id_user_id_key" ON "thesis_authors"("thesis_id", "user_id");

-- CreateIndex
CREATE INDEX "thesis_advisors_thesis_id_idx" ON "thesis_advisors"("thesis_id");

-- CreateIndex
CREATE INDEX "thesis_advisors_user_id_idx" ON "thesis_advisors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "thesis_advisors_thesis_id_user_id_key" ON "thesis_advisors"("thesis_id", "user_id");

-- CreateIndex
CREATE INDEX "thesis_documents_thesis_id_idx" ON "thesis_documents"("thesis_id");

-- CreateIndex
CREATE INDEX "thesis_documents_tipo_idx" ON "thesis_documents"("tipo");

-- CreateIndex
CREATE INDEX "thesis_status_history_thesis_id_idx" ON "thesis_status_history"("thesis_id");

-- CreateIndex
CREATE INDEX "thesis_status_history_created_at_idx" ON "thesis_status_history"("created_at");

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_authors" ADD CONSTRAINT "thesis_authors_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_authors" ADD CONSTRAINT "thesis_authors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_authors" ADD CONSTRAINT "thesis_authors_student_career_id_fkey" FOREIGN KEY ("student_career_id") REFERENCES "student_careers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_advisors" ADD CONSTRAINT "thesis_advisors_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_advisors" ADD CONSTRAINT "thesis_advisors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_documents" ADD CONSTRAINT "thesis_documents_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_documents" ADD CONSTRAINT "thesis_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_status_history" ADD CONSTRAINT "thesis_status_history_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_status_history" ADD CONSTRAINT "thesis_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
