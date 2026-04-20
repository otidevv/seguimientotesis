import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const autoresDesistidos = await prisma.thesisAuthor.findMany({
    where: { estado: 'DESISTIDO' as any },
    include: {
      thesis: { include: { historialEstados: { orderBy: { createdAt: 'asc' } } } },
      studentCareer: { include: { facultad: true } },
    },
  })

  let creados = 0
  let saltados = 0

  for (const a of autoresDesistidos) {
    const ya = await prisma.thesisWithdrawal.findUnique({ where: { thesisAuthorId: a.id } })
    if (ya) { saltados++; continue }

    const historial = a.thesis.historialEstados
    const idxDesist = historial.findIndex(h =>
      h.comentario?.toLowerCase().includes('desist') || h.estadoNuevo === 'DESISTIDA'
    )
    const estadoPrevio = idxDesist > 0
      ? historial[idxDesist - 1]?.estadoNuevo ?? 'BORRADOR'
      : 'BORRADOR'

    const teniaCoautor = await prisma.thesisAuthor.count({
      where: { thesisId: a.thesisId, id: { not: a.id }, estado: 'ACEPTADO' },
    }).then(n => n > 0)

    await prisma.thesisWithdrawal.create({
      data: {
        thesisId: a.thesisId,
        thesisAuthorId: a.id,
        userId: a.userId,
        studentCareerId: a.studentCareerId,
        motivoCategoria: 'OTRO',
        motivoDescripcion: a.motivoRechazo ?? '(Sin descripción — migración legacy)',
        estadoSolicitud: 'APROBADO',
        solicitadoAt: a.fechaRespuesta ?? a.createdAt,
        aprobadoAt: a.fechaRespuesta ?? a.createdAt,
        aprobadoPorId: null,
        estadoTesisAlSolicitar: estadoPrevio,
        faseActual: null,
        teniaCoautor,
        facultadIdSnapshot: a.studentCareer.facultadId,
        carreraNombreSnapshot: a.studentCareer.carreraNombre,
      },
    })
    creados++
  }

  console.log(`Migración legacy completada. Creados: ${creados}, saltados (ya existían): ${saltados}.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
