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
  console.log('Iniciando seed...')

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

  const modulosAdmin = ['dashboard', 'tesis', 'usuarios', 'auditoria', 'reportes', 'firma-digital']
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

  const modulosEstudiante = ['dashboard', 'tesis', 'firma-digital']
  for (const modulo of modulos) {
    const tieneAcceso = modulosEstudiante.includes(modulo.codigo)
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolEstudiante.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: tieneAcceso,
        canCreate: modulo.codigo === 'tesis',
        canEdit: modulo.codigo === 'tesis',
        canDelete: false,
      },
      create: {
        roleId: rolEstudiante.id,
        moduleId: modulo.id,
        canView: tieneAcceso,
        canCreate: modulo.codigo === 'tesis',
        canEdit: modulo.codigo === 'tesis',
        canDelete: false,
      },
    })
  }

  // ============================================
  // 8. ASIGNAR PERMISOS A DOCENTE
  // ============================================
  console.log('Asignando permisos a Docente...')

  const modulosDocente = ['dashboard', 'tesis', 'reportes', 'firma-digital']
  for (const modulo of modulos) {
    const tieneAcceso = modulosDocente.includes(modulo.codigo)
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolDocente.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: tieneAcceso,
        canCreate: false,
        canEdit: modulo.codigo === 'tesis',
        canDelete: false,
      },
      create: {
        roleId: rolDocente.id,
        moduleId: modulo.id,
        canView: tieneAcceso,
        canCreate: false,
        canEdit: modulo.codigo === 'tesis',
        canDelete: false,
      },
    })
  }

  // ============================================
  // 9. ASIGNAR PERMISOS A ASESOR
  // ============================================
  console.log('Asignando permisos a Asesor...')

  for (const modulo of modulos) {
    const tieneAcceso = ['dashboard', 'tesis', 'reportes', 'firma-digital'].includes(modulo.codigo)
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolAsesor.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: tieneAcceso,
        canCreate: false,
        canEdit: modulo.codigo === 'tesis',
        canDelete: false,
      },
      create: {
        roleId: rolAsesor.id,
        moduleId: modulo.id,
        canView: tieneAcceso,
        canCreate: false,
        canEdit: modulo.codigo === 'tesis',
        canDelete: false,
      },
    })
  }

  // ============================================
  // 10. ASIGNAR PERMISOS A JURADO
  // ============================================
  console.log('Asignando permisos a Jurado...')

  for (const modulo of modulos) {
    const tieneAcceso = ['dashboard', 'tesis', 'firma-digital'].includes(modulo.codigo)
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolJurado.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: tieneAcceso,
        canCreate: false,
        canEdit: modulo.codigo === 'tesis',
        canDelete: false,
      },
      create: {
        roleId: rolJurado.id,
        moduleId: modulo.id,
        canView: tieneAcceso,
        canCreate: false,
        canEdit: modulo.codigo === 'tesis',
        canDelete: false,
      },
    })
  }

  // ============================================
  // 11. ASIGNAR PERMISOS A COORDINADOR
  // ============================================
  console.log('Asignando permisos a Coordinador...')

  for (const modulo of modulos) {
    const tieneAcceso = ['dashboard', 'tesis', 'usuarios', 'reportes', 'firma-digital'].includes(modulo.codigo)
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: rolCoordinador.id,
          moduleId: modulo.id,
        },
      },
      update: {
        canView: tieneAcceso,
        canCreate: modulo.codigo === 'tesis',
        canEdit: tieneAcceso,
        canDelete: false,
      },
      create: {
        roleId: rolCoordinador.id,
        moduleId: modulo.id,
        canView: tieneAcceso,
        canCreate: modulo.codigo === 'tesis',
        canEdit: tieneAcceso,
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
    const tieneAcceso = ['dashboard', 'mesa-partes', 'tesis', 'reportes'].includes(modulo.codigo)
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
  // 14. CREAR USUARIOS DEL SISTEMA
  // ============================================
  console.log('Creando usuarios del sistema...')

  const defaultPassword = '954040025'
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, 12)

  // Helper para asignar rol si no existe
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

  // --- SUPER ADMIN ---
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
  await assignRole(adminUser.id, rolSuperAdmin.id)
  console.log(`  - Admin: ${adminUser.email}`)

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
  // Carrera de Alberto
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
    where: { email: 'nulloa@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '18168848',
      email: 'nulloa@unamad.edu.pe',
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
  // Info docente de Nelly
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
    where: { email: 'rmiranda@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '40941903',
      email: 'rmiranda@unamad.edu.pe',
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
  // Info docente de Ralph
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
    where: { email: '31azareza40@gmail.com' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '76927630',
      email: '31azareza40@gmail.com',
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
  // Carrera de Abner
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
    where: { email: 'jzavaleta@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '72884710',
      email: 'jzavaleta@unamad.edu.pe',
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
  // Carreras de Jefferson (tiene 2)
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
    where: { email: 'djaramillo@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '41496703',
      email: 'djaramillo@unamad.edu.pe',
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
    where: { email: 'disuiza@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '41639193',
      email: 'disuiza@unamad.edu.pe',
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
    where: { email: 'holgado@unamad.edu.pe' },
    update: {},
    create: {
      tipoDocumento: TipoDocumento.DNI,
      numeroDocumento: '44076704',
      email: 'holgado@unamad.edu.pe',
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
  // Carrera de Holgado
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
  // Info docente de Holgado
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
  // RESUMEN FINAL
  // ============================================
  console.log('\n========================================')
  console.log('SEED COMPLETADO EXITOSAMENTE')
  console.log('========================================')
  console.log('Facultades: 3')
  console.log('Escuelas: 9')
  console.log('Módulos: 11')
  console.log('Roles: 9')
  console.log('Usuarios: 10')
  console.log('----------------------------------------')
  console.log(`Contraseña para todos: ${defaultPassword}`)
  console.log('----------------------------------------')
  console.log('SUPER_ADMIN:      admin@unamad.edu.pe')
  console.log('ESTUDIANTE:       apenam@unamad.edu.pe (Alberto Peña)')
  console.log('ESTUDIANTE:       31azareza40@gmail.com (Abner Acuña)')
  console.log('ESTUDIANTE:       jzavaleta@unamad.edu.pe (Jefferson Morales)')
  console.log('DOCENTE:          nulloa@unamad.edu.pe (Nelly Ulloa)')
  console.log('DOCENTE:          rmiranda@unamad.edu.pe (Ralph Miranda)')
  console.log('MESA_PARTES:      garcia@unamad.edu.pe (Alberto Peña García)')
  console.log('DOCENTE:          djaramillo@unamad.edu.pe (Denys Jaramillo)')
  console.log('DOCENTE:          disuiza@unamad.edu.pe (Dany Isuiza)')
  console.log('ESTUDIANTE/DOC:   holgado@unamad.edu.pe (Luis Holgado)')
  console.log('========================================\n')
}

main()
  .catch((e) => {
    console.error('Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
