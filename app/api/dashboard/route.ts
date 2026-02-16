import { NextRequest, NextResponse } from 'next/server'
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

// GET /api/dashboard
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ahora = new Date()
    const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const inicioMesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)

    // 1. Contadores principales + tendencias mensuales
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
      prisma.thesis.count({ where: { deletedAt: null } }),
      prisma.thesis.count({ where: { deletedAt: null, estado: { in: [...ESTADOS_APROBADOS] } } }),
      prisma.thesis.count({ where: { deletedAt: null, estado: { in: [...ESTADOS_EN_PROCESO] } } }),
      prisma.thesisDocument.count(),
      prisma.thesis.count({ where: { createdAt: { gte: inicioMesActual }, deletedAt: null } }),
      prisma.thesis.count({ where: { createdAt: { gte: inicioMesPasado, lt: inicioMesActual }, deletedAt: null } }),
      prisma.thesisStatusHistory.count({
        where: { createdAt: { gte: inicioMesActual }, estadoNuevo: { in: [...ESTADOS_APROBADOS] } },
      }),
      prisma.thesisStatusHistory.count({
        where: { createdAt: { gte: inicioMesPasado, lt: inicioMesActual }, estadoNuevo: { in: [...ESTADOS_APROBADOS] } },
      }),
      prisma.thesisDocument.count({ where: { createdAt: { gte: inicioMesActual } } }),
      prisma.thesisDocument.count({ where: { createdAt: { gte: inicioMesPasado, lt: inicioMesActual } } }),
    ])

    // 2. Actividad mensual (ultimos 6 meses)
    const mesesData: { label: string; inicio: Date; fin: Date }[] = []
    for (let i = 5; i >= 0; i--) {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      const fin = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 0, 23, 59, 59)
      mesesData.push({ label: MESES[inicio.getMonth()], inicio, fin })
    }

    const actividadMensual = await Promise.all(
      mesesData.map(async (mes) => {
        // Tesis creadas en este mes
        const creadas = await prisma.thesis.count({
          where: { createdAt: { gte: mes.inicio, lte: mes.fin }, deletedAt: null },
        })

        // Tesis distintas que recibieron algun cambio de estado en este mes
        const cambiosDistintos = await prisma.thesisStatusHistory.findMany({
          where: { createdAt: { gte: mes.inicio, lte: mes.fin } },
          select: { thesisId: true },
          distinct: ['thesisId'],
        })

        return { month: mes.label, registradas: creadas, actualizadas: cambiosDistintos.length }
      })
    )

    // 3. Tesis por facultad
    const tesisConFacultad = await prisma.thesis.findMany({
      where: { deletedAt: null },
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

    // 4. Tesis recientes (ultimas 5)
    const tesisRecientes = await prisma.thesis.findMany({
      where: { deletedAt: null },
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

    // 5. Actividad reciente (ultimos 8 cambios de estado)
    const actividadReciente = await prisma.thesisStatusHistory.findMany({
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

    // 6. Proximos eventos (tesis en sustentacion o aprobadas)
    const proximosEventos = await prisma.thesis.findMany({
      where: {
        deletedAt: null,
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

    // Tiempo promedio desde creacion hasta aprobacion
    const tesisParaTiempo = await prisma.thesis.findMany({
      where: {
        deletedAt: null,
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
