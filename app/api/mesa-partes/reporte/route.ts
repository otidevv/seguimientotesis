import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { getMesaPartesScope } from '@/lib/auth/scope'
import { generarReporteExcel, TesisReporteData } from '@/lib/excel/reporte-mesa-partes'

// Mapeo de estados legibles
const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En Revisión',
  OBSERVADA: 'Observada',
  ASIGNANDO_JURADOS: 'Asignando Jurados',
  EN_EVALUACION_JURADO: 'En Evaluación de Jurado',
  OBSERVADA_JURADO: 'Observada por Jurado',
  PROYECTO_APROBADO: 'Proyecto Aprobado',
  INFORME_FINAL: 'Informe Final',
  EN_EVALUACION_INFORME: 'En Evaluación de Informe',
  OBSERVADA_INFORME: 'Observada Informe',
  APROBADA: 'Aprobada',
  EN_SUSTENTACION: 'En Sustentación',
  SUSTENTADA: 'Sustentada',
  ARCHIVADA: 'Archivada',
  RECHAZADA: 'Rechazada',
}

function formatNombre(user: { apellidoPaterno: string; apellidoMaterno: string; nombres: string }): string {
  return `${user.apellidoPaterno} ${user.apellidoMaterno}, ${user.nombres}`
}

function buildWhereClause(
  facultadId: string,
  anioNum: number,
  busqueda?: string | null
): Prisma.ThesisWhereInput {
  const where: Prisma.ThesisWhereInput = {
    deletedAt: null,
    createdAt: {
      gte: new Date(`${anioNum}-01-01T00:00:00.000Z`),
      lt: new Date(`${anioNum + 1}-01-01T00:00:00.000Z`),
    },
    autores: {
      some: { studentCareer: { facultadId } },
    },
  }

  const q = busqueda?.trim()
  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: 'insensitive' } },
      {
        autores: {
          some: {
            user: {
              OR: [
                { nombres: { contains: q, mode: 'insensitive' } },
                { apellidoPaterno: { contains: q, mode: 'insensitive' } },
                { apellidoMaterno: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      },
      { asesores: { some: { user: {
        OR: [
          { nombres: { contains: q, mode: 'insensitive' } },
          { apellidoPaterno: { contains: q, mode: 'insensitive' } },
          { apellidoMaterno: { contains: q, mode: 'insensitive' } },
        ],
      } } } },
    ]
  }

  return where
}

const INCLUDE_TESIS = {
  autores: {
    include: {
      user: {
        select: {
          nombres: true,
          apellidoPaterno: true,
          apellidoMaterno: true,
        },
      },
      studentCareer: {
        select: {
          carreraNombre: true,
          facultad: { select: { nombre: true } },
        },
      },
    },
    orderBy: { orden: 'asc' as const },
  },
  asesores: {
    include: {
      user: {
        select: {
          nombres: true,
          apellidoPaterno: true,
          apellidoMaterno: true,
        },
      },
    },
  },
  jurados: {
    where: { isActive: true },
    include: {
      user: {
        select: {
          nombres: true,
          apellidoPaterno: true,
          apellidoMaterno: true,
        },
      },
      evaluaciones: {
        select: { resultado: true, ronda: true },
      },
    },
  },
  documentos: {
    where: {
      esVersionActual: true,
      tipo: {
        in: ['RESOLUCION_JURADO', 'RESOLUCION_JURADO_INFORME', 'RESOLUCION_APROBACION', 'RESOLUCION_SUSTENTACION'] as const,
      },
    },
    select: {
      tipo: true,
      nombre: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  historialEstados: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      estadoNuevo: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ThesisInclude

type ThesisConRelaciones = Prisma.ThesisGetPayload<{ include: typeof INCLUDE_TESIS }>

function mapearTesis(tesis: ThesisConRelaciones[]): TesisReporteData[] {
  return tesis.map((t, idx) => {
    const autor1 = t.autores[0]
    const autor2 = t.autores[1]
    const asesorPrincipal = t.asesores.find((a) => a.tipo === 'PRINCIPAL')
    const coasesor = t.asesores.find((a) => a.tipo === 'CO_ASESOR')

    const histEnRevision = t.historialEstados.find((h) => h.estadoNuevo === 'EN_REVISION')

    const docResolucionJurado = t.documentos.find((d) => d.tipo === 'RESOLUCION_JURADO')
    const docResolucionAprobacion = t.documentos.find((d) => d.tipo === 'RESOLUCION_APROBACION')
    const docResolucionSustentacion = t.documentos.find((d) => d.tipo === 'RESOLUCION_SUSTENTACION')

    const juradosProyecto = t.jurados.filter((j) => j.fase === 'PROYECTO')
    const juradosTexto = juradosProyecto
      .sort((a, b) => {
        const orden = { PRESIDENTE: 0, VOCAL: 1, SECRETARIO: 2, ACCESITARIO: 3 }
        return (orden[a.tipo] ?? 4) - (orden[b.tipo] ?? 4)
      })
      .map((j) => `${j.tipo}: ${formatNombre(j.user)}`)
      .join(', ')

    let observacion = ''
    const evaluaciones = t.jurados.flatMap((j) => j.evaluaciones)
    if (evaluaciones.length > 0) {
      const aprobados = evaluaciones.filter((e) => e.resultado === 'APROBADO').length
      const observados = evaluaciones.filter((e) => e.resultado === 'OBSERVADO').length
      observacion = `Aprobados: ${aprobados}, Observados: ${observados}`
    } else {
      observacion = ESTADO_LABELS[t.estado] || t.estado
    }

    const histInformeFinal = t.historialEstados.find((h) => h.estadoNuevo === 'INFORME_FINAL')
    const docResJuradoInforme = t.documentos.find((d) => d.tipo === 'RESOLUCION_JURADO_INFORME')

    return {
      numero: idx + 1,
      tesista1: autor1 ? formatNombre(autor1.user) : '',
      tesista2: autor2 ? formatNombre(autor2.user) : '',
      carrera: autor1?.studentCareer?.carreraNombre || '',
      titulo: t.titulo,
      asesor: asesorPrincipal ? formatNombre(asesorPrincipal.user) : '',
      coasesor: coasesor ? formatNombre(coasesor.user) : '',
      fechaPresentacion: histEnRevision?.createdAt || null,
      nroExpediente: t.id.slice(-8).toUpperCase(),
      resolucionJurado: docResolucionJurado?.nombre || '',
      fechaResolucionJurado: docResolucionJurado?.createdAt || null,
      juradosRevisores: juradosTexto,
      observacion,
      resolucionAprobacion: docResolucionAprobacion?.nombre || '',
      fechaPresentacionInforme: histInformeFinal?.createdAt || null,
      nroExpedienteInforme: t.id.slice(-8).toUpperCase(),
      resolucionJuradoInforme: docResJuradoInforme?.nombre || '',
      resolucionSustentacion: docResolucionSustentacion?.nombre || '',
      estado: t.estado,
    }
  })
}

// GET /api/mesa-partes/reporte
// Sin parámetros: retorna lista de facultades y años disponibles
// Con facultadId + anio + formato=json: retorna preview JSON paginado (búsqueda opcional)
// Con facultadId + anio (default xlsx): retorna el Excel
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const [tieneReportes, tieneMesa] = await Promise.all([
      checkPermission(user.id, 'reportes-mp', 'view'),
      checkPermission(user.id, 'mesa-partes', 'view'),
    ])

    if (!tieneReportes && !tieneMesa) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a Reportes MP' },
        { status: 403 }
      )
    }

    // Scope de facultad (fail-closed: rol mal configurado → 403)
    const scope = getMesaPartesScope(user)
    if (!scope) {
      return NextResponse.json(
        { error: 'Tu rol de mesa-partes no tiene una facultad asignada. Contacta al administrador.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const facultadId = scope.esAdmin ? searchParams.get('facultadId') : scope.facultadId
    const anio = searchParams.get('anio')
    const formato = (searchParams.get('formato') ?? 'xlsx').toLowerCase()
    const busqueda = searchParams.get('busqueda')?.trim() || null
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))

    // Si no hay parámetros, retornar facultades y años disponibles
    if (!facultadId || !anio) {
      const facultades = await prisma.faculty.findMany({
        where: { isActive: true },
        select: { id: true, nombre: true, codigo: true },
        orderBy: { nombre: 'asc' },
      })

      const aniosResult = await prisma.thesis.findMany({
        where: { deletedAt: null },
        select: { createdAt: true },
        distinct: ['createdAt'],
        orderBy: { createdAt: 'desc' },
      })

      const aniosSet = new Set<number>()
      aniosResult.forEach((t) => {
        aniosSet.add(new Date(t.createdAt).getFullYear())
      })
      aniosSet.add(new Date().getFullYear())

      const anios = Array.from(aniosSet).sort((a, b) => b - a)

      return NextResponse.json({
        success: true,
        facultades,
        anios,
      })
    }

    const anioNum = parseInt(anio, 10)
    if (isNaN(anioNum)) {
      return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
    }

    const facultad = await prisma.faculty.findUnique({
      where: { id: facultadId },
      select: { nombre: true, codigo: true },
    })

    if (!facultad) {
      return NextResponse.json({ error: 'Facultad no encontrada' }, { status: 404 })
    }

    const whereClause = buildWhereClause(facultadId, anioNum, busqueda)

    // Preview JSON (paginado, con búsqueda)
    if (formato === 'json') {
      const [totalItems, tesisPage] = await Promise.all([
        prisma.thesis.count({ where: whereClause }),
        prisma.thesis.findMany({
          where: whereClause,
          include: INCLUDE_TESIS,
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ])

      const totalPages = Math.max(1, Math.ceil(totalItems / limit))
      // Mapear. `numero` respeta el offset global.
      const datos = mapearTesis(tesisPage).map((d, i) => ({
        ...d,
        numero: (page - 1) * limit + i + 1,
      }))

      return NextResponse.json({
        success: true,
        facultad,
        anio: anioNum,
        data: datos,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
      })
    }

    // Excel: respeta la búsqueda si está presente
    const tesisCompletas = await prisma.thesis.findMany({
      where: whereClause,
      include: INCLUDE_TESIS,
      orderBy: { createdAt: 'asc' },
    })

    const datos = mapearTesis(tesisCompletas)

    const buffer = await generarReporteExcel(datos, facultad.nombre, anioNum)
    const sufijoBusqueda = busqueda ? '-filtrado' : ''
    const nombreArchivo = `reporte-tesis-${facultad.codigo}-${anioNum}${sufijoBusqueda}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/mesa-partes/reporte] Error:', error)
    return NextResponse.json(
      { error: 'Error al generar reporte' },
      { status: 500 }
    )
  }
}
