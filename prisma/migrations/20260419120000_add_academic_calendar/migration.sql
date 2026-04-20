-- CreateEnum
CREATE TYPE "semestre_academico" AS ENUM ('I', 'II', 'VERANO');

-- CreateEnum
CREATE TYPE "academic_period_estado" AS ENUM ('PLANIFICADO', 'ACTIVO', 'CERRADO');

-- CreateEnum
CREATE TYPE "academic_window_type" AS ENUM ('PRESENTACION_PROYECTO', 'REVISION_MESA_PARTES', 'ASIGNACION_JURADOS', 'EVALUACION_JURADO', 'INFORME_FINAL', 'SUSTENTACION', 'DESISTIMIENTO');

-- CreateTable
CREATE TABLE "academic_periods" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "semestre" "semestre_academico" NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "estado" "academic_period_estado" NOT NULL DEFAULT 'PLANIFICADO',
    "es_actual" BOOLEAN NOT NULL DEFAULT false,
    "facultad_id" TEXT,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_windows" (
    "id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "tipo" "academic_window_type" NOT NULL,
    "facultad_id" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "habilitada" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_window_overrides" (
    "id" TEXT NOT NULL,
    "window_id" TEXT NOT NULL,
    "thesis_id" TEXT,
    "user_id" TEXT,
    "motivo" TEXT NOT NULL,
    "vigencia_hasta" TIMESTAMP(3) NOT NULL,
    "autorizado_por_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_window_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_periods_estado_idx" ON "academic_periods"("estado");

-- CreateIndex
CREATE INDEX "academic_periods_es_actual_idx" ON "academic_periods"("es_actual");

-- CreateIndex
CREATE INDEX "academic_periods_facultad_id_idx" ON "academic_periods"("facultad_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_periods_anio_semestre_facultad_id_key" ON "academic_periods"("anio", "semestre", "facultad_id");

-- CreateIndex
CREATE INDEX "academic_windows_tipo_idx" ON "academic_windows"("tipo");

-- CreateIndex
CREATE INDEX "academic_windows_fecha_inicio_fecha_fin_idx" ON "academic_windows"("fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE INDEX "academic_windows_facultad_id_idx" ON "academic_windows"("facultad_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_windows_periodo_id_tipo_facultad_id_key" ON "academic_windows"("periodo_id", "tipo", "facultad_id");

-- CreateIndex
CREATE INDEX "academic_window_overrides_window_id_idx" ON "academic_window_overrides"("window_id");

-- CreateIndex
CREATE INDEX "academic_window_overrides_thesis_id_idx" ON "academic_window_overrides"("thesis_id");

-- CreateIndex
CREATE INDEX "academic_window_overrides_user_id_idx" ON "academic_window_overrides"("user_id");

-- CreateIndex
CREATE INDEX "academic_window_overrides_vigencia_hasta_idx" ON "academic_window_overrides"("vigencia_hasta");

-- AddForeignKey
ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_facultad_id_fkey" FOREIGN KEY ("facultad_id") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_windows" ADD CONSTRAINT "academic_windows_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "academic_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_windows" ADD CONSTRAINT "academic_windows_facultad_id_fkey" FOREIGN KEY ("facultad_id") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_window_overrides" ADD CONSTRAINT "academic_window_overrides_window_id_fkey" FOREIGN KEY ("window_id") REFERENCES "academic_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_window_overrides" ADD CONSTRAINT "academic_window_overrides_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_window_overrides" ADD CONSTRAINT "academic_window_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_window_overrides" ADD CONSTRAINT "academic_window_overrides_autorizado_por_id_fkey" FOREIGN KEY ("autorizado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

