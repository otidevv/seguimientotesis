/**
 * Migración idempotente para crear el módulo "Reportes MP" y asignar permisos
 * a los roles existentes del sistema.
 *
 * Correr con: npx tsx prisma/scripts/add-reportes-mp-module.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  console.log('→ Creando/actualizando módulo reportes-mp...')

  const modulo = await prisma.systemModule.upsert({
    where: { codigo: 'reportes-mp' },
    update: {
      nombre: 'Reportes MP',
      descripcion: 'Reportes de Mesa de Partes: tesis por facultad/año y desistimientos',
      icono: 'FileSpreadsheet',
      ruta: '/reportes-mp',
    },
    create: {
      nombre: 'Reportes MP',
      codigo: 'reportes-mp',
      descripcion: 'Reportes de Mesa de Partes: tesis por facultad/año y desistimientos',
      icono: 'FileSpreadsheet',
      ruta: '/reportes-mp',
      orden: 16,
    },
  })
  console.log(`   ✓ Módulo listo (id=${modulo.id})`)

  // Roles que deben ver el módulo
  const rolesConAcceso = ['SUPER_ADMIN', 'ADMIN', 'MESA_PARTES', 'COORDINADOR']

  for (const codigo of rolesConAcceso) {
    const role = await prisma.role.findUnique({ where: { codigo } })
    if (!role) {
      console.log(`   – Rol ${codigo} no existe, se omite.`)
      continue
    }

    const esSuperAdmin = codigo === 'SUPER_ADMIN'
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: role.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: true,
        canCreate: esSuperAdmin,
        canEdit: esSuperAdmin,
        canDelete: esSuperAdmin,
      },
      create: {
        roleId: role.id,
        moduleId: modulo.id,
        canView: true,
        canCreate: esSuperAdmin,
        canEdit: esSuperAdmin,
        canDelete: esSuperAdmin,
      },
    })
    console.log(`   ✓ Permiso canView otorgado a ${codigo}`)
  }

  console.log('✓ Migración completada.')
}

main()
  .catch((err) => {
    console.error('✗ Error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
