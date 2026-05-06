import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { getMesaPartesScope, tesisFueraDeScope } from '@/lib/auth/scope'
import { requiereResolucionDesistimiento } from '@/lib/desistimiento/transiciones'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const puede = await checkPermission(user.id, 'mesa-partes', 'view')
    if (!puede) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    // Scope de facultad: si el user es MESA_PARTES con contextId, solo accede a
    // desistimientos de su facultad. Fail-closed para roles mal configurados.
    const scope = getMesaPartesScope(user)
    if (!scope) {
      return NextResponse.json(
        { error: 'Tu rol de mesa-partes no tiene una facultad asignada. Contacta al administrador.' },
        { status: 403 }
      )
    }

    const w = await prisma.thesisWithdrawal.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, email: true, numeroDocumento: true } },
        thesis: {
          include: {
            autores: {
              include: {
                user: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
                studentCareer: { select: { codigoEstudiante: true, carreraNombre: true } },
              },
            },
            asesores: {
              include: { user: { select: { id: true, nombres: true, apellidoPaterno: true } } },
            },
            documentos: {
              where: { tipo: { in: ['RESOLUCION_JURADO', 'RESOLUCION_APROBACION', 'RESOLUCION_DESISTIMIENTO'] } },
              orderBy: [{ tipo: 'asc' }, { version: 'asc' }],
            },
          },
        },
        facultadSnapshot: { select: { id: true, nombre: true, codigo: true } },
        resolucionDocumento: true,
        aprobadoPor: { select: { nombres: true, apellidoPaterno: true } },
      },
    })
    if (!w) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // Enforce facultad scope
    if (tesisFueraDeScope(scope, w.facultadIdSnapshot)) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const coautoresActivos = w.thesis.autores.filter(a => a.user.id !== w.userId && a.estado === 'ACEPTADO')
    const hayCoautorQueContinua = coautoresActivos.length > 0
    const tieneResolucionJurado = w.thesis.documentos.some(d => d.tipo === 'RESOLUCION_JURADO')

    return NextResponse.json({
      id: w.id,
      estadoSolicitud: w.estadoSolicitud,
      solicitadoAt: w.solicitadoAt,
      aprobadoAt: w.aprobadoAt,
      aprobadoPor: w.aprobadoPor ? `${w.aprobadoPor.nombres} ${w.aprobadoPor.apellidoPaterno}` : null,
      motivoCategoria: w.motivoCategoria,
      motivoDescripcion: w.motivoDescripcion,
      motivoRechazoMesaPartes: w.motivoRechazoMesaPartes,
      estadoTesisAlSolicitar: w.estadoTesisAlSolicitar,
      faseActual: w.faseActual,
      teniaCoautor: w.teniaCoautor,
      hayCoautorQueContinua,
      tieneResolucionJurado,
      // Obligatorio subir RESOLUCION_DESISTIMIENTO si existe RESOLUCION_JURADO,
      // sin importar si hay coautor: si la tesis se cierra (autor único), igual
      // hay que formalizar el desistimiento porque ya hubo resolución oficial.
      requiereResolucionDesistimiento: requiereResolucionDesistimiento(tieneResolucionJurado),
      estudiante: {
        id: w.user.id,
        nombreCompleto: `${w.user.apellidoPaterno} ${w.user.apellidoMaterno}, ${w.user.nombres}`,
        email: w.user.email,
        documento: w.user.numeroDocumento,
        carrera: w.carreraNombreSnapshot,
        facultad: w.facultadSnapshot.nombre,
      },
      tesis: {
        id: w.thesis.id,
        titulo: w.thesis.titulo,
        estado: w.thesis.estado,
        coautoresActivos: coautoresActivos.map(c => ({
          id: c.user.id,
          nombre: `${c.user.apellidoPaterno} ${c.user.apellidoMaterno}, ${c.user.nombres}`,
          codigo: c.studentCareer.codigoEstudiante,
        })),
        asesores: w.thesis.asesores.map(a => ({
          id: a.user.id,
          nombre: `${a.user.nombres} ${a.user.apellidoPaterno}`,
          tipo: a.tipo,
        })),
        resolucionesVigentes: w.thesis.documentos
          .filter(d => d.esVersionActual)
          .map(d => ({
            id: d.id, tipo: d.tipo, nombre: d.nombre, version: d.version, createdAt: d.createdAt,
          })),
        cadenaResoluciones: w.thesis.documentos.map(d => ({
          id: d.id,
          tipo: d.tipo,
          nombre: d.nombre,
          version: d.version,
          esVersionActual: d.esVersionActual,
          esModificatoria: d.esModificatoria,
          reemplazaDocumentoId: d.reemplazaDocumentoId,
          createdAt: d.createdAt,
        })),
      },
      // Solo exponemos como "resolución de desistimiento" si el documento vinculado
      // es del tipo correcto. Withdrawals históricos (aprobados con la lógica anterior
      // de modificatoria) tienen resolucionDocumentoId apuntando a una RESOLUCION_JURADO,
      // y mostrarlos aquí sería engañoso.
      resolucionDesistimiento:
        w.resolucionDocumento && w.resolucionDocumento.tipo === 'RESOLUCION_DESISTIMIENTO'
          ? {
              id: w.resolucionDocumento.id,
              nombre: w.resolucionDocumento.nombre,
              rutaArchivo: w.resolucionDocumento.rutaArchivo,
            }
          : null,
    })
  } catch (error) {
    console.error('[Mesa-partes desistimiento detail]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
