import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const COLORES_FACULTAD = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const ESTADOS_APROBADOS = ['APROBADA', 'EN_SUSTENTACION', 'SUSTENTADA'] as const
const ESTADOS_EN_PROCESO = [
  'EN_REVISION', 'OBSERVADA', 'ASIGNANDO_JURADOS',
  'EN_EVALUACION_JURADO', 'OBSERVADA_JURADO',
  'INFORME_FINAL', 'EN_EVALUACION_INFORME', 'OBSERVADA_INFORME',
] as const

function calcularTendencia(actual: number, anterior: number): number {
  if (anterior === 0) return actual > 0 ? 100 : 0
  return Math.round(((actual - anterior) / anterior) * 100)
}

type ScopeType = 'global' | 'facultad' | 'personal' | 'mixed' | 'empty'

interface DashboardScope {
  thesisWhere: Prisma.ThesisWhereInput
  type: ScopeType
  facultadIds: string[]
}

/**
 * Calcula el alcance (where-clause de Thesis) según los roles del usuario.
 * - ADMIN/SUPER_ADMIN: ve todo
 * - MESA_PARTES con contexto FACULTAD: solo esa facultad
 * - MESA_PARTES sin contexto: todas las facultades (global)
 * - ESTUDIANTE: solo tesis donde es autor
 * - DOCENTE/EXTERNO: solo tesis donde es asesor (ACEPTADO) o jurado activo
 * - Multi-rol: unión (OR) de los alcances aplicables
 */
type UserRoleRow = {
  role: { codigo: string }
  isActive: boolean
  contextType: string | null
  contextId: string | null
}

type ScopedUser = {
  id: string
  roles: UserRoleRow[]
}

function buildScope(user: ScopedUser): DashboardScope {
  const roles = user.roles ?? []
  const isAdmin = roles.some(
    (r) => ['ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
  )

  if (isAdmin) {
    return {
      thesisWhere: { deletedAt: null },
      type: 'global',
      facultadIds: [],
    }
  }

  const conditions: Prisma.ThesisWhereInput[] = []
  const facultadIds: string[] = []
  let sawPersonal = false
  let sawFacultad = false
  let sawGlobalMesaPartes = false

  for (const r of roles) {
    if (!r.isActive) continue
    if (r.role.codigo === 'MESA_PARTES') {
      if (r.contextType === 'FACULTAD' && r.contextId) {
        conditions.push({
          autores: {
            some: { studentCareer: { facultadId: r.contextId } },
          },
        })
        facultadIds.push(r.contextId)
        sawFacultad = true
      } else {
        // Mesa de partes sin contexto de facultad: alcance global
        sawGlobalMesaPartes = true
      }
    }
  }

  // Si es mesa-partes global, no agregamos más filtros (ve todo)
  if (sawGlobalMesaPartes) {
    return {
      thesisWhere: { deletedAt: null },
      type: 'global',
      facultadIds: [],
    }
  }

  const isEstudiante = roles.some(
    (r) => r.role.codigo === 'ESTUDIANTE' && r.isActive
  )
  if (isEstudiante) {
    conditions.push({
      autores: { some: { userId: user.id } },
    })
    sawPersonal = true
  }

  const isAdvisor = roles.some(
    (r) => ['DOCENTE', 'EXTERNO'].includes(r.role.codigo) && r.isActive
  )
  if (isAdvisor) {
    conditions.push({
      OR: [
        { asesores: { some: { userId: user.id, estado: 'ACEPTADO' } } },
        { jurados: { some: { userId: user.id, isActive: true } } },
      ],
    })
    sawPersonal = true
  }

  if (conditions.length === 0) {
    // Usuario sin roles que otorguen acceso: no ve nada.
    return {
      thesisWhere: { deletedAt: null, id: '__no_access__' },
      type: 'empty',
      facultadIds: [],
    }
  }

  const type: ScopeType =
    sawFacultad && sawPersonal
      ? 'mixed'
      : sawFacultad
        ? 'facultad'
        : 'personal'

  return {
    thesisWhere: { deletedAt: null, OR: conditions },
    type,
    facultadIds,
  }
}

// GET /api/dashboard
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const scope = buildScope(user)
    const { thesisWhere } = scope

    const ahora = new Date()
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const inicioMesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)

    // 1. Contadores principales + tendencias mensuales (todo respetando el scope)
    const [
      totalTesis,
      aprobadas,
      enProceso,
      documentos,
      nuevasEsteMes,
      nuevasMesPasado,
      aprobadasEsteMes,
      aprobadasMesPasado,
      docsEsteMes,
      docsMesPasado,
    ] = await Promise.all([
      prisma.thesis.count({ where: thesisWhere }),
      prisma.thesis.count({
        where: { ...thesisWhere, estado: { in: [...ESTADOS_APROBADOS] } },
      }),
      prisma.thesis.count({
        where: { ...thesisWhere, estado: { in: [...ESTADOS_EN_PROCESO] } },
      }),
      prisma.thesisDocument.count({ where: { thesis: thesisWhere } }),
      prisma.thesis.count({
        where: { ...thesisWhere, createdAt: { gte: inicioMesActual } },
      }),
      prisma.thesis.count({
        where: {
          ...thesisWhere,
          createdAt: { gte: inicioMesPasado, lt: inicioMesActual },
        },
      }),
      prisma.thesisStatusHistory.count({
        where: {
          createdAt: { gte: inicioMesActual },
          estadoNuevo: { in: [...ESTADOS_APROBADOS] },
          thesis: thesisWhere,
        },
      }),
      prisma.thesisStatusHistory.count({
        where: {
          createdAt: { gte: inicioMesPasado, lt: inicioMesActual },
          estadoNuevo: { in: [...ESTADOS_APROBADOS] },
          thesis: thesisWhere,
        },
      }),
      prisma.thesisDocument.count({
        where: { createdAt: { gte: inicioMesActual }, thesis: thesisWhere },
      }),
      prisma.thesisDocument.count({
        where: {
          createdAt: { gte: inicioMesPasado, lt: inicioMesActual },
          thesis: thesisWhere,
        },
      }),
    ])

    // 2. Actividad mensual (últimos 6 meses) — scoped
    const mesesData: { label: string; inicio: Date; fin: Date }[] = []
    for (let i = 5; i >= 0; i--) {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      const fin = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 0, 23, 59, 59)
      mesesData.push({ label: MESES[inicio.getMonth()], inicio, fin })
    }

    const actividadMensual = await Promise.all(
      mesesData.map(async (mes) => {
        const creadas = await prisma.thesis.count({
          where: {
            ...thesisWhere,
            createdAt: { gte: mes.inicio, lte: mes.fin },
          },
        })

        const cambiosDistintos = await prisma.thesisStatusHistory.findMany({
          where: {
            createdAt: { gte: mes.inicio, lte: mes.fin },
            thesis: thesisWhere,
          },
          select: { thesisId: true },
          distinct: ['thesisId'],
        })

        return {
          month: mes.label,
          registradas: creadas,
          actualizadas: cambiosDistintos.length,
        }
      })
    )

    // 3. Tesis por facultad — scoped
    const tesisConFacultad = await prisma.thesis.findMany({
      where: thesisWhere,
      select: {
        autores: {
          take: 1,
          orderBy: { orden: 'asc' },
          select: {
            studentCareer: {
              select: { facultad: { select: { id: true, nombre: true } } },
            },
          },
        },
      },
    })

    const facultadCounts: Record<string, { nombre: string; count: number }> = {}
    tesisConFacultad.forEach((t) => {
      const facultad = t.autores[0]?.studentCareer?.facultad
      if (facultad) {
        if (!facultadCounts[facultad.id]) {
          facultadCounts[facultad.id] = { nombre: facultad.nombre, count: 0 }
        }
        facultadCounts[facultad.id].count++
      }
    })

    const tesisPorFacultad = Object.values(facultadCounts)
      .sort((a, b) => b.count - a.count)
      .map((f, i) => ({
        name: f.nombre,
        value: f.count,
        color: COLORES_FACULTAD[i % COLORES_FACULTAD.length],
      }))

    // 4. Tesis recientes — scoped
    const tesisRecientes = await prisma.thesis.findMany({
      where: thesisWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        titulo: true,
        estado: true,
        createdAt: true,
        autores: {
          take: 1,
          orderBy: { orden: 'asc' },
          select: {
            user: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
            studentCareer: {
              select: { carreraNombre: true, facultad: { select: { nombre: true } } },
            },
          },
        },
      },
    })

    // 5. Actividad reciente (últimos 8 cambios de estado) — scoped al alcance
    const actividadReciente = await prisma.thesisStatusHistory.findMany({
      where: { thesis: thesisWhere },
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        estadoAnterior: true,
        estadoNuevo: true,
        comentario: true,
        createdAt: true,
        changedBy: { select: { nombres: true, apellidoPaterno: true } },
        thesis: { select: { titulo: true } },
      },
    })

    // 6. Próximos eventos — scoped
    const proximosEventos = await prisma.thesis.findMany({
      where: {
        ...thesisWhere,
        estado: { in: ['EN_SUSTENTACION', 'APROBADA'] },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        titulo: true,
        estado: true,
        fechaSustentacion: true,
        updatedAt: true,
        autores: {
          take: 1,
          orderBy: { orden: 'asc' },
          select: {
            user: { select: { nombres: true, apellidoPaterno: true } },
            studentCareer: { select: { carreraNombre: true } },
          },
        },
      },
    })

    // 7. Stats avanzados
    const tasaAprobacion = totalTesis > 0 ? Math.round((aprobadas / totalTesis) * 1000) / 10 : 0

    const tesisParaTiempo = await prisma.thesis.findMany({
      where: {
        ...thesisWhere,
        estado: { in: [...ESTADOS_APROBADOS] },
      },
      select: {
        createdAt: true,
        historialEstados: {
          where: { estadoNuevo: 'APROBADA' },
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        },
      },
    })

    let tiempoPromedioMeses = 0
    const conTiempo = tesisParaTiempo.filter((t) => t.historialEstados.length > 0)
    if (conTiempo.length > 0) {
      const totalDias = conTiempo.reduce((acc, t) => {
        const diff = t.historialEstados[0].createdAt.getTime() - t.createdAt.getTime()
        return acc + diff / (1000 * 60 * 60 * 24)
      }, 0)
      tiempoPromedioMeses = Math.round((totalDias / conTiempo.length / 30) * 10) / 10
    }

    return NextResponse.json({
      success: true,
      scope: {
        type: scope.type,
        facultadIds: scope.facultadIds,
      },
      stats: {
        totalTesis,
        aprobadas,
        enProceso,
        documentos,
        tendencias: {
          tesis: calcularTendencia(nuevasEsteMes, nuevasMesPasado),
          aprobadas: calcularTendencia(aprobadasEsteMes, aprobadasMesPasado),
          documentos: calcularTendencia(docsEsteMes, docsMesPasado),
        },
      },
      actividadMensual,
      tesisPorFacultad,
      tesisRecientes: tesisRecientes.map((t) => {
        const autor = t.autores[0]
        return {
          id: t.id,
          titulo: t.titulo,
          estado: t.estado,
          estudiante: autor
            ? `${autor.user.nombres} ${autor.user.apellidoPaterno} ${autor.user.apellidoMaterno}`
            : 'Sin autor',
          facultad: autor?.studentCareer?.facultad?.nombre || 'Sin facultad',
          fechaCreacion: t.createdAt,
        }
      }),
      actividadReciente: actividadReciente.map((a) => ({
        estadoAnterior: a.estadoAnterior,
        estadoNuevo: a.estadoNuevo,
        comentario: a.comentario,
        usuario: `${a.changedBy.nombres} ${a.changedBy.apellidoPaterno}`,
        tesis: a.thesis.titulo,
        fecha: a.createdAt,
      })),
      proximosEventos: proximosEventos.map((t) => {
        const autor = t.autores[0]
        return {
          id: t.id,
          titulo: t.titulo,
          estado: t.estado,
          fecha: t.fechaSustentacion || t.updatedAt,
          estudiante: autor
            ? `${autor.user.nombres} ${autor.user.apellidoPaterno}`
            : 'Sin autor',
          carrera: autor?.studentCareer?.carreraNombre || '',
        }
      }),
      statsAvanzados: {
        tasaAprobacion,
        tiempoPromedioMeses,
        tesisEsteMes: nuevasEsteMes,
      },
    })
  } catch (error) {
    console.error('[GET /api/dashboard] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    )
  }
}
