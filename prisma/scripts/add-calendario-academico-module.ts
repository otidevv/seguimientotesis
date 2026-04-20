/**
 * Migracion idempotente para registrar el modulo "calendario-academico" con permisos
 * para SUPER_ADMIN y ADMIN. Correr con:
 *   npx tsx prisma/scripts/add-calendario-academico-module.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  console.log('>>> Registrando modulo calendario-academico...')

  const modulo = await prisma.systemModule.upsert({
    where: { codigo: 'calendario-academico' },
    update: {
      nombre: 'Calendario Academico',
      descripcion: 'Gestion de periodos academicos y ventanas de tramite',
      icono: 'CalendarDays',
      ruta: '/admin/calendario-academico',
    },
    create: {
      nombre: 'Calendario Academico',
      codigo: 'calendario-academico',
      descripcion: 'Gestion de periodos academicos y ventanas de tramite',
      icono: 'CalendarDays',
      ruta: '/admin/calendario-academico',
      orden: 20,
    },
  })
  console.log(`   modulo listo (id=${modulo.id})`)

  const rolesConAcceso = ['SUPER_ADMIN', 'ADMIN']
  for (const codigo of rolesConAcceso) {
    const role = await prisma.role.findUnique({ where: { codigo } })
    if (!role) { console.log(`   rol ${codigo} no existe, se omite.`); continue }
    await prisma.rolePermission.upsert({
      where: { roleId_moduleId: { roleId: role.id, moduleId: modulo.id } },
      update: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      create: {
        roleId: role.id, moduleId: modulo.id,
        canView: true, canCreate: true, canEdit: true, canDelete: true,
      },
    })
    console.log(`   permisos otorgados a ${codigo}`)
  }

  console.log('   OK')
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
