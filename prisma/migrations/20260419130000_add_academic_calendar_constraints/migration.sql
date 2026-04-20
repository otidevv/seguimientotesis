-- Partial unique indexes: el @@unique de Prisma con facultad_id nullable no
-- garantiza unicidad cuando la columna es NULL (Postgres trata NULL como distinto).
-- Estos indices cierran el hueco.

-- Unicidad de periodo global (facultad_id NULL) por anio+semestre.
CREATE UNIQUE INDEX IF NOT EXISTS "academic_periods_anio_semestre_global_key"
  ON "academic_periods" ("anio", "semestre")
  WHERE "facultad_id" IS NULL;

-- Unicidad de ventana global por periodo+tipo.
CREATE UNIQUE INDEX IF NOT EXISTS "academic_windows_periodo_tipo_global_key"
  ON "academic_windows" ("periodo_id", "tipo")
  WHERE "facultad_id" IS NULL;

-- Un unico periodo puede ser "es_actual = true" por scope: uno por cada facultad
-- y uno global. Impedimos que admin deje dos activos en paralelo.
CREATE UNIQUE INDEX IF NOT EXISTS "academic_periods_es_actual_por_facultad_key"
  ON "academic_periods" ("facultad_id")
  WHERE "es_actual" = true AND "facultad_id" IS NOT NULL;

-- Un unico periodo global puede estar marcado como actual.
CREATE UNIQUE INDEX IF NOT EXISTS "academic_periods_es_actual_global_key"
  ON "academic_periods" ((true))
  WHERE "es_actual" = true AND "facultad_id" IS NULL;
