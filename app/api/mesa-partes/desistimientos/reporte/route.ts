import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, MotivoDesistimiento, EstadoTesis } from '@prisma/client'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { generarExcelDesistimientos, type DesistimientoRow } from '@/lib/excel/reporte-desistimientos'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const puede = await checkPermission(user.id, 'mesa-partes', 'view')
    if (!puede) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const formato = searchParams.get('formato') ?? 'json'
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const facultadId = searchParams.get('facultadId')
    const carrera = searchParams.get('carrera')
    const motivos = searchParams.getAll('motivo')
    const estadosTesis = searchParams.getAll('estadoTesis')
    const teniaCoautor = searchParams.get('teniaCoautor')

    const aprobadoAtFilter: Prisma.DateTimeNullableFilter = {}
    if (desde) aprobadoAtFilter.gte = new Date(desde)
    if (hasta) aprobadoAtFilter.lte = new Date(hasta)

    const where: Prisma.ThesisWithdrawalWhereInput = {
      estadoSolicitud: 'APROBADO',
      ...(desde || hasta ? { aprobadoAt: aprobadoAtFilter } : {}),
      ...(facultadId ? { facultadIdSnapshot: facultadId } : {}),
      ...(carrera ? { carreraNombreSnapshot: carrera } : {}),
      ...(motivos.length > 0 ? { motivoCategoria: { in: motivos as MotivoDesistimiento[] } } : {}),
      ...(estadosTesis.length > 0 ? { estadoTesisAlSolicitar: { in: estadosTesis as EstadoTesis[] } } : {}),
      ...(teniaCoautor === 'true' ? { teniaCoautor: true } : {}),
      ...(teniaCoautor === 'false' ? { teniaCoautor: false } : {}),
    }

    const items = await prisma.thesisWithdrawal.findMany({
      where,
      orderBy: { aprobadoAt: 'desc' },
      include: {
        user: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true, numeroDocumento: true } },
        thesis: { select: { titulo: true } },
        facultadSnapshot: { select: { nombre: true } },
        studentCareer: { select: { codigoEstudiante: true } },
      },
    })

    const rows: DesistimientoRow[] = items.map(i => ({
      solicitadoAt: i.solicitadoAt,
      aprobadoAt: i.aprobadoAt,
      estudiante: `${i.user.apellidoPaterno} ${i.user.apellidoMaterno}, ${i.user.nombres}`,
      codigo: i.studentCareer.codigoEstudiante,
      documento: i.user.numeroDocumento,
      carrera: i.carreraNombreSnapshot,
      facultad: i.facultadSnapshot.nombre,
      tituloTesis: i.thesis.titulo,
      motivoCategoria: i.motivoCategoria,
      motivoDescripcion: i.motivoDescripcion,
      estadoTesisAlSolicitar: i.estadoTesisAlSolicitar,
      faseActual: i.faseActual,
      teniaCoautor: i.teniaCoautor,
    }))

    if (formato === 'xlsx') {
      const buffer = await generarExcelDesistimientos(rows, `Reporte de Desistimientos — UNAMAD`)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="desistimientos-${Date.now()}.xlsx"`,
        },
      })
    }

    const porMotivo = new Map<string, number>()
    const porFacultad = new Map<string, number>()
    const porEstadoTesis = new Map<string, number>()
    let conCoautor = 0
    rows.forEach(r => {
      porMotivo.set(r.motivoCategoria, (porMotivo.get(r.motivoCategoria) ?? 0) + 1)
      porFacultad.set(r.facultad, (porFacultad.get(r.facultad) ?? 0) + 1)
      porEstadoTesis.set(r.estadoTesisAlSolicitar, (porEstadoTesis.get(r.estadoTesisAlSolicitar) ?? 0) + 1)
      if (r.teniaCoautor) conCoautor++
    })

    return NextResponse.json({
      total: rows.length,
      conCoautor,
      sinCoautor: rows.length - conCoautor,
      porMotivo: Array.from(porMotivo, ([k, v]) => ({ key: k, count: v })),
      porFacultad: Array.from(porFacultad, ([k, v]) => ({ key: k, count: v })),
      porEstadoTesis: Array.from(porEstadoTesis, ([k, v]) => ({ key: k, count: v })),
      items: rows,
    })
  } catch (error) {
    console.error('[Reporte desistimientos]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
