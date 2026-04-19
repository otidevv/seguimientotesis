import { PrismaClient, TipoDocumento } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcrypt'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('=== SEED ADMIN: Configuración del sistema ===\n')

  // ============================================
  // 1. CREAR FACULTADES
  // ============================================
  console.log('Creando facultades...')

  const facultadIngenieria = await prisma.faculty.upsert({
    where: { codigo: 'FI' },
    update: {},
    create: {
      nombre: 'Facultad de Ingeniería',
      codigo: 'FI',
    },
  })

  const facultadEducacion = await prisma.faculty.upsert({
    where: { codigo: 'FE' },
    update: {},
    create: {
      nombre: 'Facultad de Educación',
      codigo: 'FE',
    },
  })

  const facultadEmpresariales = await prisma.faculty.upsert({
    where: { codigo: 'FCE' },
    update: {},
    create: {
      nombre: 'Facultad de Ciencias Empresariales',
      codigo: 'FCE',
    },
  })

  console.log(`Facultades creadas: ${facultadIngenieria.nombre}, ${facultadEducacion.nombre}, ${facultadEmpresariales.nombre}`)

  // ============================================
  // 2. CREAR ESCUELAS PROFESIONALES
  // ============================================
  console.log('Creando escuelas profesionales...')

  // Escuelas de Ingeniería
  await prisma.school.upsert({
    where: { codigo: 'ISI' },
    update: {},
    create: {
      nombre: 'Ingeniería de Sistemas e Informática',
      codigo: 'ISI',
      facultadId: facultadIngenieria.id,
    },
  })

  await prisma.school.upsert({
    where: { codigo: 'IAG' },
    update: {},
    create: {
      nombre: 'Ingeniería Agroindustrial',
      codigo: 'IAG',
      facultadId: facultadIngenieria.id,
    },
  })

  await prisma.school.upsert({
    where: { codigo: 'IFO' },
    update: {},
    create: {
      nombre: 'Ingeniería Forestal y Medio Ambiente',
      codigo: 'IFO',
      facultadId: facultadIngenieria.id,
    },
  })

  // Escuelas de Educación
  await prisma.school.upsert({
    where: { codigo: 'EPI' },
    update: {},
    create: {
      nombre: 'Educación Primaria e Interculturalidad',
      codigo: 'EPI',
      facultadId: facultadEducacion.id,
    },
  })

  await prisma.school.upsert({
    where: { codigo: 'EMF' },
    update: {},
    create: {
      nombre: 'Educación: Matemática y Física',
      codigo: 'EMF',
      facultadId: facultadEducacion.id,
    },
  })

  // Escuelas de Ciencias Empresariales
  await prisma.school.upsert({
    where: { codigo: 'ADM' },
    update: {},
    create: {
      nombre: 'Administración y Negocios Internacionales',
      codigo: 'ADM',
      facultadId: facultadEmpresariales.id,
    },
  })

  await prisma.school.upsert({
    where: { codigo: 'CON' },
    update: {},
    create: {
      nombre: 'Contabilidad y Finanzas',
      codigo: 'CON',
      facultadId: facultadEmpresariales.id,
    },
  })

  await prisma.school.upsert({
    where: { codigo: 'ECO' },
    update: {},
    create: {
      nombre: 'Economía',
      codigo: 'ECO',
      facultadId: facultadEmpresariales.id,
    },
  })

  await prisma.school.upsert({
    where: { codigo: 'TUR' },
    update: {},
    create: {
      nombre: 'Ecoturismo',
      codigo: 'TUR',
      facultadId: facultadEmpresariales.id,
    },
  })

  console.log('Escuelas profesionales creadas')

  // ============================================
  // 3. CREAR MODULOS DEL SISTEMA
  // ============================================
  console.log('Creando módulos del sistema...')

  const modulos = await Promise.all([
    prisma.systemModule.upsert({
      where: { codigo: 'dashboard' },
      update: {},
      create: {
        nombre: 'Dashboard',
        codigo: 'dashboard',
        descripcion: 'Panel principal del sistema',
        icono: 'LayoutDashboard',
        ruta: '/dashboard',
        orden: 1,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'tesis' },
      update: {},
      create: {
        nombre: 'Gestión de Tesis',
        codigo: 'tesis',
        descripcion: 'Administración de tesis y proyectos de investigación',
        icono: 'BookOpen',
        ruta: '/tesis',
        orden: 2,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'usuarios' },
      update: {},
      create: {
        nombre: 'Gestión de Usuarios',
        codigo: 'usuarios',
        descripcion: 'Administración de usuarios del sistema',
        icono: 'Users',
        ruta: '/admin/usuarios',
        orden: 3,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'roles' },
      update: {},
      create: {
        nombre: 'Gestión de Roles',
        codigo: 'roles',
        descripcion: 'Administración de roles y permisos',
        icono: 'Shield',
        ruta: '/admin/roles',
        orden: 4,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'modulos' },
      update: {},
      create: {
        nombre: 'Gestión de Módulos',
        codigo: 'modulos',
        descripcion: 'Administración de módulos del sistema',
        icono: 'Boxes',
        ruta: '/admin/modulos',
        orden: 5,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'permisos' },
      update: {},
      create: {
        nombre: 'Matriz de Permisos',
        codigo: 'permisos',
        descripcion: 'Configuración de permisos por rol y módulo',
        icono: 'Key',
        ruta: '/admin/permisos',
        orden: 6,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'auditoria' },
      update: {},
      create: {
        nombre: 'Auditoría',
        codigo: 'auditoria',
        descripcion: 'Registro de actividades del sistema',
        icono: 'FileSearch',
        ruta: '/admin/auditoria',
        orden: 7,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'reportes' },
      update: {},
      create: {
        nombre: 'Reportes',
        codigo: 'reportes',
        descripcion: 'Generación de reportes y estadísticas',
        icono: 'BarChart3',
        ruta: '/reportes',
        orden: 8,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'firma-digital' },
      update: {},
      create: {
        nombre: 'Firma Digital',
        codigo: 'firma-digital',
        descripcion: 'Firma electrónica de documentos con Firma Perú',
        icono: 'PenTool',
        ruta: '/firma-peru',
        orden: 9,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'configuracion' },
      update: {},
      create: {
        nombre: 'Configuración',
        codigo: 'configuracion',
        descripcion: 'Configuración general del sistema',
        icono: 'Settings',
        ruta: '/admin/configuracion',
        orden: 10,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'mesa-partes' },
      update: {},
      create: {
        nombre: 'Mesa de Partes',
        codigo: 'mesa-partes',
        descripcion: 'Recepción y gestión de proyectos de tesis por facultad',
        icono: 'Inbox',
        ruta: '/mesa-partes',
        orden: 11,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'reportes-mp' },
      update: {},
      create: {
        nombre: 'Reportes MP',
        codigo: 'reportes-mp',
        descripcion: 'Reportes de Mesa de Partes: tesis por facultad/año y desistimientos',
        icono: 'FileSpreadsheet',
        ruta: '/reportes-mp',
        orden: 16,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'mis-tesis' },
      update: {},
      create: {
        nombre: 'Mis Tesis',
        codigo: 'mis-tesis',
        descripcion: 'Gestión de tesis del estudiante',
        icono: 'GraduationCap',
        ruta: '/mis-tesis',
        orden: 12,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'mis-invitaciones' },
      update: {},
      create: {
        nombre: 'Mis Invitaciones',
        codigo: 'mis-invitaciones',
        descripcion: 'Invitaciones recibidas como coautor o asesor',
        icono: 'Mail',
        ruta: '/mis-invitaciones',
        orden: 13,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'mis-asesorias' },
      update: {},
      create: {
        nombre: 'Mis Asesorías',
        codigo: 'mis-asesorias',
        descripcion: 'Gestión de asesorías del docente',
        icono: 'GraduationCap',
        ruta: '/mis-asesorias',
        orden: 14,
      },
    }),
    prisma.systemModule.upsert({
      where: { codigo: 'mis-evaluaciones' },
      update: {},
      create: {
        nombre: 'Mis Evaluaciones',
        codigo: 'mis-evaluaciones',
        descripcion: 'Evaluaciones de tesis como jurado',
        icono: 'ClipboardCheck',
        ruta: '/mis-evaluaciones',
        orden: 15,
      },
    }),
  ])

  console.log(`Módulos creados: ${modulos.length}`)

  // ============================================
  // 4. CREAR ROLES DEL SISTEMA
  // ============================================
  console.log('Creando roles del sistema...')

  const rolSuperAdmin = await prisma.role.upsert({
    where: { codigo: 'SUPER_ADMIN' },
    update: {},
    create: {
      nombre: 'Super Administrador',
      codigo: 'SUPER_ADMIN',
      descripcion: 'Acceso total al sistema. No puede ser eliminado.',
      color: '#dc2626',
      isSystem: true,
    },
  })

  const rolAdmin = await prisma.role.upsert({
    where: { codigo: 'ADMIN' },
    update: {},
    create: {
      nombre: 'Administrador',
      codigo: 'ADMIN',
      descripcion: 'Administrador del sistema con acceso a gestión de usuarios.',
      color: '#ea580c',
      isSystem: true,
    },
  })

  const rolEstudiante = await prisma.role.upsert({
    where: { codigo: 'ESTUDIANTE' },
    update: {},
    create: {
      nombre: 'Estudiante',
      codigo: 'ESTUDIANTE',
      descripcion: 'Estudiante de la universidad. Puede gestionar sus tesis.',
      color: '#16a34a',
      isSystem: true,
    },
  })

  const rolDocente = await prisma.role.upsert({
    where: { codigo: 'DOCENTE' },
    update: {},
    create: {
      nombre: 'Docente',
      codigo: 'DOCENTE',
      descripcion: 'Docente de la universidad.',
      color: '#2563eb',
      isSystem: true,
    },
  })

  const rolAsesor = await prisma.role.upsert({
    where: { codigo: 'ASESOR' },
    update: {},
    create: {
      nombre: 'Asesor de Tesis',
      codigo: 'ASESOR',
      descripcion: 'Docente asignado como asesor de tesis.',
      color: '#7c3aed',
      isSystem: false,
    },
  })

  const rolJurado = await prisma.role.upsert({
    where: { codigo: 'JURADO' },
    update: {},
    create: {
      nombre: 'Jurado',
      codigo: 'JURADO',
      descripcion: 'Docente asignado como jurado evaluador de tesis.',
      color: '#0891b2',
      isSystem: false,
    },
  })

  const rolCoordinador = await prisma.role.upsert({
    where: { codigo: 'COORDINADOR' },
    update: {},
    create: {
      nombre: 'Coordinador',
      codigo: 'COORDINADOR',
      descripcion: 'Coordinador de escuela profesional.',
      color: '#ca8a04',
      isSystem: false,
    },
  })

  const rolExterno = await prisma.role.upsert({
    where: { codigo: 'EXTERNO' },
    update: {},
    create: {
      nombre: 'Externo',
      codigo: 'EXTERNO',
      descripcion: 'Usuario externo a la universidad.',
      color: '#64748b',
      isSystem: true,
    },
  })

  const rolMesaPartes = await prisma.role.upsert({
    where: { codigo: 'MESA_PARTES' },
    update: {},
    create: {
      nombre: 'Mesa de Partes',
      codigo: 'MESA_PARTES',
      descripcion: 'Personal de mesa de partes de facultad. Recibe y gestiona proyectos de tesis.',
      color: '#0d9488',
      isSystem: false,
    },
  })

  console.log('Roles creados: 9')

  // ============================================
  // 5. ASIGNAR PERMISOS AL SUPER ADMIN (TODOS)
  // ============================================
  console.log('Asignando permisos al Super Admin...')

  for (const modulo of modulos) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolSuperAdmin.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      },
      create: {
        roleId: rolSuperAdmin.id,
        moduleId: modulo.id,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      },
    })
  }

  // ============================================
  // 6. ASIGNAR PERMISOS AL ADMIN
  // ============================================
  console.log('Asignando permisos al Admin...')

  const modulosAdmin = ['dashboard', 'tesis', 'usuarios', 'auditoria', 'reportes', 'reportes-mp', 'firma-digital', 'configuracion']
  for (const modulo of modulos) {
    const tieneAcceso = modulosAdmin.includes(modulo.codigo)
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolAdmin.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: tieneAcceso,
        canCreate: tieneAcceso,
        canEdit: tieneAcceso,
        canDelete: modulo.codigo !== 'usuarios',
      },
      create: {
        roleId: rolAdmin.id,
        moduleId: modulo.id,
        canView: tieneAcceso,
        canCreate: tieneAcceso,
        canEdit: tieneAcceso,
        canDelete: modulo.codigo !== 'usuarios',
      },
    })
  }

  // ============================================
  // 7. ASIGNAR PERMISOS A ESTUDIANTE
  // ============================================
  console.log('Asignando permisos a Estudiante...')

  const modulosEstudianteView = ['dashboard', 'mis-tesis', 'mis-invitaciones']
  const modulosEstudianteCreate = ['mis-tesis']
  const modulosEstudianteEdit = ['mis-tesis']
  for (const modulo of modulos) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolEstudiante.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: modulosEstudianteView.includes(modulo.codigo),
        canCreate: modulosEstudianteCreate.includes(modulo.codigo),
        canEdit: modulosEstudianteEdit.includes(modulo.codigo),
        canDelete: false,
      },
      create: {
        roleId: rolEstudiante.id,
        moduleId: modulo.id,
        canView: modulosEstudianteView.includes(modulo.codigo),
        canCreate: modulosEstudianteCreate.includes(modulo.codigo),
        canEdit: modulosEstudianteEdit.includes(modulo.codigo),
        canDelete: false,
      },
    })
  }

  // ============================================
  // 8. ASIGNAR PERMISOS A DOCENTE
  // ============================================
  console.log('Asignando permisos a Docente...')

  const modulosDocenteView = ['dashboard', 'mis-asesorias', 'mis-evaluaciones', 'mis-invitaciones']
  const modulosDocenteCreate: string[] = []
  const modulosDocenteEdit = ['mis-evaluaciones']
  for (const modulo of modulos) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolDocente.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: modulosDocenteView.includes(modulo.codigo),
        canCreate: modulosDocenteCreate.includes(modulo.codigo),
        canEdit: modulosDocenteEdit.includes(modulo.codigo),
        canDelete: false,
      },
      create: {
        roleId: rolDocente.id,
        moduleId: modulo.id,
        canView: modulosDocenteView.includes(modulo.codigo),
        canCreate: modulosDocenteCreate.includes(modulo.codigo),
        canEdit: modulosDocenteEdit.includes(modulo.codigo),
        canDelete: false,
      },
    })
  }

  // ============================================
  // 9. ASIGNAR PERMISOS A ASESOR
  // ============================================
  console.log('Asignando permisos a Asesor...')

  const modulosAsesorView = ['dashboard', 'tesis', 'mis-asesorias', 'mis-invitaciones', 'reportes', 'firma-digital']
  const modulosAsesorCreate = ['firma-digital']
  const modulosAsesorEdit = ['tesis']
  for (const modulo of modulos) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolAsesor.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: modulosAsesorView.includes(modulo.codigo),
        canCreate: modulosAsesorCreate.includes(modulo.codigo),
        canEdit: modulosAsesorEdit.includes(modulo.codigo),
        canDelete: false,
      },
      create: {
        roleId: rolAsesor.id,
        moduleId: modulo.id,
        canView: modulosAsesorView.includes(modulo.codigo),
        canCreate: modulosAsesorCreate.includes(modulo.codigo),
        canEdit: modulosAsesorEdit.includes(modulo.codigo),
        canDelete: false,
      },
    })
  }

  // ============================================
  // 10. ASIGNAR PERMISOS A JURADO
  // ============================================
  console.log('Asignando permisos a Jurado...')

  const modulosJuradoView = ['dashboard', 'tesis', 'mis-evaluaciones', 'reportes', 'firma-digital']
  const modulosJuradoCreate = ['firma-digital']
  const modulosJuradoEdit = ['tesis', 'mis-evaluaciones']
  for (const modulo of modulos) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolJurado.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: modulosJuradoView.includes(modulo.codigo),
        canCreate: modulosJuradoCreate.includes(modulo.codigo),
        canEdit: modulosJuradoEdit.includes(modulo.codigo),
        canDelete: false,
      },
      create: {
        roleId: rolJurado.id,
        moduleId: modulo.id,
        canView: modulosJuradoView.includes(modulo.codigo),
        canCreate: modulosJuradoCreate.includes(modulo.codigo),
        canEdit: modulosJuradoEdit.includes(modulo.codigo),
        canDelete: false,
      },
    })
  }

  // ============================================
  // 11. ASIGNAR PERMISOS A COORDINADOR
  // ============================================
  console.log('Asignando permisos a Coordinador...')

  const modulosCoordinadorView = ['dashboard', 'tesis', 'usuarios', 'mis-asesorias', 'mis-invitaciones', 'mis-evaluaciones', 'reportes', 'firma-digital']
  const modulosCoordinadorCreate = ['tesis', 'firma-digital']
  const modulosCoordinadorEdit = ['tesis', 'usuarios', 'mis-evaluaciones']
  for (const modulo of modulos) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolCoordinador.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: modulosCoordinadorView.includes(modulo.codigo),
        canCreate: modulosCoordinadorCreate.includes(modulo.codigo),
        canEdit: modulosCoordinadorEdit.includes(modulo.codigo),
        canDelete: false,
      },
      create: {
        roleId: rolCoordinador.id,
        moduleId: modulo.id,
        canView: modulosCoordinadorView.includes(modulo.codigo),
        canCreate: modulosCoordinadorCreate.includes(modulo.codigo),
        canEdit: modulosCoordinadorEdit.includes(modulo.codigo),
        canDelete: false,
      },
    })
  }

  // ============================================
  // 12. ASIGNAR PERMISOS A EXTERNO
  // ============================================
  console.log('Asignando permisos a Externo...')

  for (const modulo of modulos) {
    const tieneAcceso = modulo.codigo === 'dashboard'
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolExterno.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: tieneAcceso,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      },
      create: {
        roleId: rolExterno.id,
        moduleId: modulo.id,
        canView: tieneAcceso,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      },
    })
  }

  // ============================================
  // 13. ASIGNAR PERMISOS A MESA DE PARTES
  // ============================================
  console.log('Asignando permisos a Mesa de Partes...')

  for (const modulo of modulos) {
    const tieneAcceso = ['dashboard', 'mesa-partes', 'reportes-mp', 'tesis', 'reportes'].includes(modulo.codigo)
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolMesaPartes.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: tieneAcceso,
        canCreate: false,
        canEdit: modulo.codigo === 'mesa-partes' || modulo.codigo === 'tesis',
        canDelete: false,
      },
      create: {
        roleId: rolMesaPartes.id,
        moduleId: modulo.id,
        canView: tieneAcceso,
        canCreate: false,
        canEdit: modulo.codigo === 'mesa-partes' || modulo.codigo === 'tesis',
        canDelete: false,
      },
    })
  }

  // ============================================
  // 14. CREAR USUARIO SUPER ADMIN
  // ============================================
  console.log('Creando usuario Super Admin...')

  const defaultPassword = '954040025'
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, 12)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '00000000',
      username: 'admin',
      email: 'admin@unamad.edu.pe',
      passwordHash: defaultPasswordHash,
      nombres: 'Super',
      apellidoPaterno: 'Admin',
      apellidoMaterno: 'Sistema',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  const existing = await prisma.userRole.findFirst({
    where: { userId: adminUser.id, roleId: rolSuperAdmin.id, contextType: null, contextId: null },
  })
  if (!existing) {
    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: rolSuperAdmin.id },
    })
  }

  // ============================================
  // RESUMEN
  // ============================================
  console.log('\n========================================')
  console.log('SEED ADMIN COMPLETADO')
  console.log('========================================')
  console.log('Facultades: 3')
  console.log('Escuelas: 9')
  console.log('Módulos: 15')
  console.log('Roles: 9 (con permisos asignados)')
  console.log('Usuario Admin: admin@unamad.edu.pe')
  console.log(`Contraseña: ${defaultPassword}`)
  console.log('========================================\n')
}

main()
  .catch((e) => {
    console.error('Error en seed-admin:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
