import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Datos del proyecto de desarrollo (recrea la tesis usada para probar el flujo)
const PROYECTO = {
  titulo: 'realidad aumentada',
  autorEmail: 'apenam@unamad.edu.pe',           // Alberto (ESTUDIANTE)
  autorCodigoCarrera: '13121005',               // Ing. Sistemas
  coautorEmail: 'bytevoxtec@gmail.com',         // Jefferson (Tesista 2) - PENDIENTE
  coautorCodigoCarrera: '13121013',             // Ing. Sistemas
  asesorEmail: 'verseker2@gmail.com',           // Nelly (Asesor) - PENDIENTE
}

async function main() {
  console.log('=== SEED DEV PROJECT: Tesis de prueba para desarrollo ===\n')

  // Resolver IDs de usuarios
  const autor = await prisma.user.findUnique({ where: { email: PROYECTO.autorEmail } })
  const coautor = await prisma.user.findUnique({ where: { email: PROYECTO.coautorEmail } })
  const asesor = await prisma.user.findUnique({ where: { email: PROYECTO.asesorEmail } })

  if (!autor || !coautor || !asesor) {
    console.error('Faltan usuarios base. Ejecuta antes: npm run db:seed:users')
    console.error(`  autor  (${PROYECTO.autorEmail}): ${autor ? 'OK' : 'FALTA'}`)
    console.error(`  coautor(${PROYECTO.coautorEmail}): ${coautor ? 'OK' : 'FALTA'}`)
    console.error(`  asesor (${PROYECTO.asesorEmail}): ${asesor ? 'OK' : 'FALTA'}`)
    process.exit(1)
  }

  const autorCareer = await prisma.studentCareer.findUnique({
    where: { userId_codigoEstudiante: { userId: autor.id, codigoEstudiante: PROYECTO.autorCodigoCarrera } },
  })
  const coautorCareer = await prisma.studentCareer.findUnique({
    where: { userId_codigoEstudiante: { userId: coautor.id, codigoEstudiante: PROYECTO.coautorCodigoCarrera } },
  })

  if (!autorCareer || !coautorCareer) {
    console.error('Faltan carreras base. Ejecuta antes: npm run db:seed:users')
    process.exit(1)
  }

  // Idempotencia: si ya existe una tesis activa para Alberto en esta carrera, no recrear
  const existente = await prisma.thesis.findFirst({
    where: {
      deletedAt: null,
      estado: { notIn: ['RECHAZADA', 'ARCHIVADA'] },
      autores: {
        some: {
          userId: autor.id,
          studentCareerId: autorCareer.id,
          estado: { in: ['PENDIENTE', 'ACEPTADO'] },
        },
      },
    },
    select: { id: true, titulo: true, estado: true },
  })

  if (existente) {
    console.log(`Ya existe tesis activa — no se recrea:`)
    console.log(`  id:     ${existente.id}`)
    console.log(`  título: ${existente.titulo}`)
    console.log(`  estado: ${existente.estado}`)
    console.log(`\nPara recrear, elimínala primero (o usa npm run db:reset).`)
    return
  }

  // Crear tesis con mismo shape que POST /api/tesis
  const tesis = await prisma.thesis.create({
    data: {
      titulo: PROYECTO.titulo,
      estado: 'BORRADOR',
      palabrasClave: [],
      autores: {
        create: {
          userId: autor.id,
          studentCareerId: autorCareer.id,
          orden: 1,
          estado: 'ACEPTADO',
        },
      },
      asesores: {
        create: {
          userId: asesor.id,
          tipo: 'PRINCIPAL',
          estado: 'PENDIENTE',
        },
      },
    },
  })

  // Coautor (tesista 2) PENDIENTE
  await prisma.thesisAuthor.create({
    data: {
      thesisId: tesis.id,
      userId: coautor.id,
      studentCareerId: coautorCareer.id,
      orden: 2,
      estado: 'PENDIENTE',
    },
  })

  // Historial
  await prisma.thesisStatusHistory.create({
    data: {
      thesisId: tesis.id,
      estadoNuevo: 'BORRADOR',
      comentario: 'Proyecto creado por seed-dev-project',
      changedById: autor.id,
    },
  })

  console.log('Tesis de desarrollo creada:')
  console.log(`  id:      ${tesis.id}`)
  console.log(`  título:  ${tesis.titulo}`)
  console.log(`  autor:   ${PROYECTO.autorEmail}`)
  console.log(`  tesista2:${PROYECTO.coautorEmail} (PENDIENTE)`)
  console.log(`  asesor:  ${PROYECTO.asesorEmail} (PENDIENTE)`)
  console.log(`\nAbrir: http://localhost:3000/mis-tesis/${tesis.id}`)
}

main()
  .catch((e) => {
    console.error('Error en seed-dev-project:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
