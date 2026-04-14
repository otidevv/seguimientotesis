import { PrismaClient, TipoDocumento } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcrypt'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function assignRole(userId: string, roleId: string, context?: { contextType: string; contextId: string }) {
  const existing = await prisma.userRole.findFirst({
    where: {
      userId,
      roleId,
      contextType: context?.contextType ?? null,
      contextId: context?.contextId ?? null,
    },
  })
  if (!existing) {
    await prisma.userRole.create({
      data: {
        userId,
        roleId,
        ...(context ? { contextType: context.contextType, contextId: context.contextId } : {}),
      },
    })
  }
}

async function main() {
  console.log('=== SEED USERS: Creación de usuarios ===\n')

  // Obtener roles existentes (deben existir del seed-admin)
  const rolEstudiante = await prisma.role.findUniqueOrThrow({ where: { codigo: 'ESTUDIANTE' } })
  const rolDocente = await prisma.role.findUniqueOrThrow({ where: { codigo: 'DOCENTE' } })
  const rolExterno = await prisma.role.findUniqueOrThrow({ where: { codigo: 'EXTERNO' } })
  const rolMesaPartes = await prisma.role.findUniqueOrThrow({ where: { codigo: 'MESA_PARTES' } })

  // Obtener facultades existentes
  const facultadIngenieria = await prisma.faculty.findUniqueOrThrow({ where: { codigo: 'FI' } })
  const facultadEducacion = await prisma.faculty.findUniqueOrThrow({ where: { codigo: 'FE' } })
  const facultadEmpresariales = await prisma.faculty.findUniqueOrThrow({ where: { codigo: 'FCE' } })

  const defaultPassword = '954040025'
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, 12)

  console.log('Creando usuarios...')

  // --- ESTUDIANTE: Alberto Peña Mondragón ---
  const albertoUser = await prisma.user.upsert({
    where: { email: 'apenam@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '77493318',
      email: 'apenam@unamad.edu.pe',
      passwordHash: defaultPasswordHash,
      nombres: 'ALBERTO',
      apellidoPaterno: 'PEÑA',
      apellidoMaterno: 'MONDRAGON',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  await assignRole(albertoUser.id, rolEstudiante.id)
  await prisma.studentCareer.upsert({
    where: { userId_codigoEstudiante: { userId: albertoUser.id, codigoEstudiante: '13121005' } },
    update: {},
    create: {
      userId: albertoUser.id,
      codigoEstudiante: '13121005',
      carreraNombre: 'INGENIERÍA DE SISTEMAS E INFORMÁTICA',
      facultadId: facultadIngenieria.id,
    },
  })
  console.log(`  - Estudiante: ${albertoUser.email}`)

  // --- DOCENTE: Nelly Jacqueline Ulloa Gallardo ---
  const nellyUser = await prisma.user.upsert({
    where: { email: 'verseker2@gmail.com' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '18168848',
      email: 'verseker2@gmail.com',
      passwordHash: defaultPasswordHash,
      nombres: 'NELLY JACQUELINE',
      apellidoPaterno: 'ULLOA',
      apellidoMaterno: 'GALLARDO',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  await assignRole(nellyUser.id, rolDocente.id)
  await prisma.teacherInfo.upsert({
    where: { userId: nellyUser.id },
    update: {},
    create: {
      userId: nellyUser.id,
      codigoDocente: '41070',
      departamentoAcademico: 'INGENIERIA DE SISTEMAS E INFORMATICA',
      facultadId: facultadIngenieria.id,
    },
  })
  console.log(`  - Docente: ${nellyUser.email}`)

  // --- DOCENTE: Ralph Miranda Castillo ---
  const ralphUser = await prisma.user.upsert({
    where: { email: 'bytevoxtechnologies@gmail.com' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '40941903',
      email: 'bytevoxtechnologies@gmail.com',
      passwordHash: defaultPasswordHash,
      nombres: 'RALPH',
      apellidoPaterno: 'MIRANDA',
      apellidoMaterno: 'CASTILLO',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  await assignRole(ralphUser.id, rolDocente.id)
  await prisma.teacherInfo.upsert({
    where: { userId: ralphUser.id },
    update: {},
    create: {
      userId: ralphUser.id,
      codigoDocente: '41455',
      departamentoAcademico: 'INGENIERIA DE SISTEMAS E INFORMATICA',
      facultadId: facultadIngenieria.id,
    },
  })
  console.log(`  - Docente: ${ralphUser.email}`)

  // --- ESTUDIANTE: Abner Acuña Carrasco ---
  const abnerUser = await prisma.user.upsert({
    where: { email: 'aacunac@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '76927630',
      email: 'aacunac@unamad.edu.pe',
      passwordHash: defaultPasswordHash,
      nombres: 'ABNER',
      apellidoPaterno: 'ACUÑA',
      apellidoMaterno: 'CARRASCO',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  await assignRole(abnerUser.id, rolEstudiante.id)
  await prisma.studentCareer.upsert({
    where: { userId_codigoEstudiante: { userId: abnerUser.id, codigoEstudiante: '13221030' } },
    update: {},
    create: {
      userId: abnerUser.id,
      codigoEstudiante: '13221030',
      carreraNombre: 'INGENIERÍA DE SISTEMAS E INFORMÁTICA',
      facultadId: facultadIngenieria.id,
    },
  })
  console.log(`  - Estudiante: ${abnerUser.email}`)

  // --- ESTUDIANTE: Jefferson Morales Zavaleta ---
  const jeffersonUser = await prisma.user.upsert({
    where: { email: 'bytevoxtec@gmail.com' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '72884710',
      email: 'bytevoxtec@gmail.com',
      passwordHash: defaultPasswordHash,
      nombres: 'JEFFERSON',
      apellidoPaterno: 'MORALES',
      apellidoMaterno: 'ZAVALETA',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  await assignRole(jeffersonUser.id, rolEstudiante.id)
  await prisma.studentCareer.upsert({
    where: { userId_codigoEstudiante: { userId: jeffersonUser.id, codigoEstudiante: '20137013' } },
    update: {},
    create: {
      userId: jeffersonUser.id,
      codigoEstudiante: '20137013',
      carreraNombre: 'CONTABILIDAD Y FINANZAS',
      facultadId: facultadEmpresariales.id,
    },
  })
  await prisma.studentCareer.upsert({
    where: { userId_codigoEstudiante: { userId: jeffersonUser.id, codigoEstudiante: '13121013' } },
    update: {},
    create: {
      userId: jeffersonUser.id,
      codigoEstudiante: '13121013',
      carreraNombre: 'INGENIERÍA DE SISTEMAS E INFORMÁTICA',
      facultadId: facultadIngenieria.id,
    },
  })
  console.log(`  - Estudiante: ${jeffersonUser.email}`)

  // --- MESA DE PARTES: Alberto Peña García ---
  const garciaUser = await prisma.user.upsert({
    where: { email: 'garcia@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '43819949',
      email: 'garcia@unamad.edu.pe',
      passwordHash: defaultPasswordHash,
      nombres: 'ALBERTO',
      apellidoPaterno: 'PEÑA',
      apellidoMaterno: 'GARCIA',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  await assignRole(garciaUser.id, rolExterno.id)
  await assignRole(garciaUser.id, rolMesaPartes.id, {
    contextType: 'FACULTAD',
    contextId: facultadIngenieria.id,
  })
  console.log(`  - Mesa de Partes: ${garciaUser.email}`)

  // --- DOCENTE: Denys Alberto Jaramillo Peralta ---
  const jaramrilloUser = await prisma.user.upsert({
    where: { email: 'docenteprueba@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '41496703',
      email: 'docenteprueba@unamad.edu.pe',
      passwordHash: defaultPasswordHash,
      nombres: 'DENYS ALBERTO',
      apellidoPaterno: 'JARAMILLO',
      apellidoMaterno: 'PERALTA',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  await assignRole(jaramrilloUser.id, rolDocente.id)
  await prisma.teacherInfo.upsert({
    where: { userId: jaramrilloUser.id },
    update: {},
    create: {
      userId: jaramrilloUser.id,
      codigoDocente: '41670',
      departamentoAcademico: 'INGENIERIA DE SISTEMAS E INFORMATICA',
      facultadId: facultadIngenieria.id,
    },
  })
  console.log(`  - Docente: ${jaramrilloUser.email}`)

  // --- DOCENTE: Dany Dorian Isuiza Perez ---
  const isuizaUser = await prisma.user.upsert({
    where: { email: 'sistemascuc@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '41639193',
      email: 'sistemascuc@unamad.edu.pe',
      passwordHash: defaultPasswordHash,
      nombres: 'DANY DORIAN',
      apellidoPaterno: 'ISUIZA',
      apellidoMaterno: 'PEREZ',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  await assignRole(isuizaUser.id, rolDocente.id)
  await prisma.teacherInfo.upsert({
    where: { userId: isuizaUser.id },
    update: {},
    create: {
      userId: isuizaUser.id,
      codigoDocente: '41375',
      departamentoAcademico: 'INGENIERIA DE SISTEMAS E INFORMATICA',
      facultadId: facultadIngenieria.id,
    },
  })
  console.log(`  - Docente: ${isuizaUser.email}`)

  // --- ESTUDIANTE/DOCENTE: Luis Alberto Holgado Apaza ---
  const holgadoUser = await prisma.user.upsert({
    where: { email: 'pruebasoti@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '44076704',
      email: 'pruebasoti@unamad.edu.pe',
      passwordHash: defaultPasswordHash,
      nombres: 'LUIS ALBERTO',
      apellidoPaterno: 'HOLGADO',
      apellidoMaterno: 'APAZA',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  await assignRole(holgadoUser.id, rolEstudiante.id)
  await assignRole(holgadoUser.id, rolDocente.id)
  await prisma.studentCareer.upsert({
    where: { userId_codigoEstudiante: { userId: holgadoUser.id, codigoEstudiante: '01131015' } },
    update: {},
    create: {
      userId: holgadoUser.id,
      codigoEstudiante: '01131015',
      carreraNombre: 'EDUCACIÓN ESPECIALIDAD MATEMÁTICA Y COMPUTACIÓN',
      facultadId: facultadEducacion.id,
    },
  })
  await prisma.teacherInfo.upsert({
    where: { userId: holgadoUser.id },
    update: {},
    create: {
      userId: holgadoUser.id,
      codigoDocente: '41671',
      departamentoAcademico: 'INGENIERIA DE SISTEMAS E INFORMATICA',
      facultadId: facultadIngenieria.id,
    },
  })
  console.log(`  - Estudiante/Docente: ${holgadoUser.email}`)

  // ============================================
  // RESUMEN
  // ============================================
  console.log('\n========================================')
  console.log('SEED USERS COMPLETADO')
  console.log('========================================')
  console.log('Usuarios creados: 9')
  console.log(`Contraseña para todos: ${defaultPassword}`)
  console.log('----------------------------------------')
  console.log('ESTUDIANTE:       apenam@unamad.edu.pe (Alberto Peña)')
  console.log('DOCENTE:          verseker2@gmail.com (Nelly Ulloa)')
  console.log('DOCENTE:          bytevoxtechnologies@gmail.com (Ralph Miranda)')
  console.log('ESTUDIANTE:       aacunac@unamad.edu.pe (Abner Acuña)')
  console.log('ESTUDIANTE:       bytevoxtec@gmail.com (Jefferson Morales)')
  console.log('MESA_PARTES:      garcia@unamad.edu.pe (Alberto Peña García)')
  console.log('DOCENTE:          docenteprueba@unamad.edu.pe (Denys Jaramillo)')
  console.log('DOCENTE:          sistemascuc@unamad.edu.pe (Dany Isuiza)')
  console.log('ESTUDIANTE/DOC:   pruebasoti@unamad.edu.pe (Luis Holgado)')
  console.log('========================================\n')
}

main()
  .catch((e) => {
    console.error('Error en seed-users:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
