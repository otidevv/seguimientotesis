import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, MotivoDesistimiento, EstadoTesis } from '@prisma/client'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { generarExcelDesistimientos, type DesistimientoRow } from '@/lib/excel/reporte-desistimientos'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Acepta permiso de Reportes MP (módulo propio) o mesa-partes (fallback).
    const [tieneReportes, tieneMesa] = await Promise.all([
      checkPermission(user.id, 'reportes-mp', 'view'),
      checkPermission(user.id, 'mesa-partes', 'view'),
    ])
    if (!tieneReportes && !tieneMesa) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    // Scope de facultad: si tiene MESA_PARTES con contextId, se enforza.
    const esAdmin = user.roles?.some(
      r => ['ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
    )
    const rolMesaPartes = !esAdmin ? user.roles?.find(
      r => r.role.codigo === 'MESA_PARTES' && r.isActive && r.contextType === 'FACULTAD' && r.contextId
    ) : null

    const { searchParams } = new URL(request.url)
    const formato = searchParams.get('formato') ?? 'json'
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const facultadIdParam = searchParams.get('facultadId')
    const facultadId = rolMesaPartes?.contextId ?? facultadIdParam
    const carrera = searchParams.get('carrera')
    const motivos = searchParams.getAll('motivo')
    const estadosTesis = searchParams.getAll('estadoTesis')
    const teniaCoautor = searchParams.get('teniaCoautor')

    // Parsear fechas como día local de Perú (UTC-5), no como UTC medianoche.
    // `desde` = 00:00:00 del día en Perú; `hasta` = 23:59:59.999 del día en Perú.
    // Esto evita que un desistimiento aprobado "hoy" en Perú quede fuera del rango
    // cuando la hora UTC cae en otro día.
    const PE_OFFSET = '-05:00'
    const aprobadoAtFilter: Prisma.DateTimeNullableFilter = {}
    if (desde) aprobadoAtFilter.gte = new Date(`${desde}T00:00:00${PE_OFFSET}`)
    if (hasta) aprobadoAtFilter.lte = new Date(`${hasta}T23:59:59.999${PE_OFFSET}`)

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
    const porMes = new Map<string, number>()
    let conCoautor = 0
    let tiempoTotalMs = 0
    let tiemposValidos = 0

    rows.forEach(r => {
      porMotivo.set(r.motivoCategoria, (porMotivo.get(r.motivoCategoria) ?? 0) + 1)
      porFacultad.set(r.facultad, (porFacultad.get(r.facultad) ?? 0) + 1)
      porEstadoTesis.set(r.estadoTesisAlSolicitar, (porEstadoTesis.get(r.estadoTesisAlSolicitar) ?? 0) + 1)
      if (r.teniaCoautor) conCoautor++
      if (r.aprobadoAt) {
        // YYYY-MM en zona horaria de Perú para la agrupación temporal
        const mes = new Date(r.aprobadoAt)
          .toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
          .slice(0, 7)
        porMes.set(mes, (porMes.get(mes) ?? 0) + 1)
        tiempoTotalMs += new Date(r.aprobadoAt).getTime() - new Date(r.solicitadoAt).getTime()
        tiemposValidos++
      }
    })

    // KPIs operativos (sobre TODO el scope de la facultad, no solo APROBADOs)
    const whereScope: Prisma.ThesisWithdrawalWhereInput = {}
    if (facultadId) whereScope.facultadIdSnapshot = facultadId
    const hace3DiasHabiles = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    const [pendientesTotal, pendientesSlaExcedido, totalResueltas, totalRechazadas] = await Promise.all([
      prisma.thesisWithdrawal.count({
        where: { ...whereScope, estadoSolicitud: 'PENDIENTE' },
      }),
      prisma.thesisWithdrawal.count({
        where: {
          ...whereScope,
          estadoSolicitud: 'PENDIENTE',
          solicitadoAt: { lt: hace3DiasHabiles },
        },
      }),
      prisma.thesisWithdrawal.count({
        where: { ...whereScope, estadoSolicitud: { in: ['APROBADO', 'RECHAZADO'] } },
      }),
      prisma.thesisWithdrawal.count({
        where: { ...whereScope, estadoSolicitud: 'RECHAZADO' },
      }),
    ])

    const tiempoPromedioHoras = tiemposValidos > 0
      ? +(tiempoTotalMs / tiemposValidos / (1000 * 60 * 60)).toFixed(1)
      : 0
    const tasaAprobacion = totalResueltas > 0
      ? +(((totalResueltas - totalRechazadas) / totalResueltas) * 100).toFixed(1)
      : 0

    return NextResponse.json({
      total: rows.length,
      conCoautor,
      sinCoautor: rows.length - conCoautor,
      porMotivo: Array.from(porMotivo, ([k, v]) => ({ key: k, count: v })),
      porFacultad: Array.from(porFacultad, ([k, v]) => ({ key: k, count: v })),
      porEstadoTesis: Array.from(porEstadoTesis, ([k, v]) => ({ key: k, count: v })),
      porMes: Array.from(porMes.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => ({ key, count })),
      kpis: {
        tiempoPromedioHoras,
        tasaAprobacion,
        pendientesTotal,
        pendientesSlaExcedido,
      },
      items: rows,
    })
  } catch (error) {
    console.error('[Reporte desistimientos]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
