/**
 * Seed idempotente del calendario academico.
 *
 * Crea (o actualiza si ya existe) un periodo ACTIVO global "2026-I" con ventanas
 * por defecto abiertas. Sirve para desbloquear entornos de dev/staging tras
 * aplicar la migracion del calendario. No toca periodos existentes con otras
 * claves (anio, semestre, facultadId).
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  console.log('>>> Seeding calendario academico (periodo 2026-I global)...')

  const fechaInicio = new Date('2026-03-01T00:00:00-05:00')
  const fechaFin = new Date('2026-07-31T23:59:59-05:00')

  // Prisma no soporta null en @@unique compuesto desde `where` de upsert,
  // asi que emulamos el upsert con findFirst + create/update.
  const existente = await prisma.academicPeriod.findFirst({
    where: { anio: 2026, semestre: 'I', facultadId: null },
  })
  const periodo = existente
    ? await prisma.academicPeriod.update({
        where: { id: existente.id },
        data: { estado: 'ACTIVO', esActual: true, fechaInicio, fechaFin },
      })
    : await prisma.academicPeriod.create({
        data: {
          anio: 2026,
          semestre: 'I',
          nombre: '2026-I',
          fechaInicio,
          fechaFin,
          estado: 'ACTIVO',
          esActual: true,
          observaciones: 'Periodo de ejemplo creado por el seed inicial.',
        },
      })

  console.log(`  periodo: ${periodo.nombre} (${periodo.id})`)

  const tiposVentana = [
    'PRESENTACION_PROYECTO',
    'REVISION_MESA_PARTES',
    'ASIGNACION_JURADOS',
    'EVALUACION_JURADO',
    'INFORME_FINAL',
    'SUSTENTACION',
    'DESISTIMIENTO',
  ] as const

  for (const tipo of tiposVentana) {
    const existing = await prisma.academicWindow.findFirst({
      where: { periodoId: periodo.id, tipo, facultadId: null },
    })
    if (existing) {
      await prisma.academicWindow.update({
        where: { id: existing.id },
        data: { fechaInicio, fechaFin, habilitada: true },
      })
    } else {
      await prisma.academicWindow.create({
        data: { periodoId: periodo.id, tipo, fechaInicio, fechaFin, habilitada: true },
      })
    }
    console.log(`  ventana: ${tipo} -> abierta`)
  }

  console.log('\n  OK')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
