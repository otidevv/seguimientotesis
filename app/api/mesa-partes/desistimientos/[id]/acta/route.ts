import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { getMesaPartesScope, tesisFueraDeScope } from '@/lib/auth/scope'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import { generarActaDesistimiento } from '@/lib/pdf/acta-desistimiento'
import { existeActaCache, leerActaCache } from '@/lib/pdf/acta-cache'

const ESTADO_TESIS_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión por mesa de partes',
  OBSERVADA: 'Observada por mesa de partes',
  ASIGNANDO_JURADOS: 'Asignando jurados',
  EN_EVALUACION_JURADO: 'En evaluación por jurado',
  OBSERVADA_JURADO: 'Observada por jurado',
  PROYECTO_APROBADO: 'Proyecto aprobado',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Mesa de partes puede descargar; el propio tesista también (para su constancia)
    const esMesaPartes = await checkPermission(user.id, 'mesa-partes', 'view')

    const w = await prisma.thesisWithdrawal.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, numeroDocumento: true } },
        thesis: {
          include: {
            autores: {
              include: { user: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true } } },
              orderBy: { orden: 'asc' },
            },
          },
        },
        facultadSnapshot: { select: { nombre: true } },
        studentCareer: { select: { codigoEstudiante: true } },
        aprobadoPor: { select: { nombres: true, apellidoPaterno: true } },
      },
    })
    if (!w) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const esPropioTesista = w.userId === user.id
    if (!esMesaPartes && !esPropioTesista) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    // Si es mesa-partes (no tesista propio) y tiene scope de facultad, enforce
    if (esMesaPartes && !esPropioTesista) {
      const scope = getMesaPartesScope(user)
      if (!scope) {
        return NextResponse.json(
          { error: 'Tu rol de mesa-partes no tiene una facultad asignada. Contacta al administrador.' },
          { status: 403 }
        )
      }
      if (tesisFueraDeScope(scope, w.facultadIdSnapshot)) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      }
    }

    if (w.estadoSolicitud !== 'APROBADO') {
      return NextResponse.json(
        { error: 'Solo se puede descargar el acta de desistimientos APROBADOS.' },
        { status: 400 }
      )
    }

    // Servir el snapshot cacheado al momento de aprobar. Si no existe (registros
    // anteriores al fix), generar on-demand como fallback.
    if (existeActaCache(w.id)) {
      const cached = leerActaCache(w.id)
      return new NextResponse(new Uint8Array(cached), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="acta-desistimiento-${w.thesisId.slice(-8).toUpperCase()}.pdf"`,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    const coautorActivo = w.thesis.autores.find(
      a => a.user.id !== w.userId && a.estado === 'ACEPTADO',
    )

    const buffer = await generarActaDesistimiento({
      desistimiento: {
        id: w.id,
        solicitadoAt: w.solicitadoAt,
        aprobadoAt: w.aprobadoAt,
        aprobadoPor: w.aprobadoPor
          ? `${w.aprobadoPor.nombres} ${w.aprobadoPor.apellidoPaterno}`
          : null,
        motivoCategoriaLabel: MOTIVO_LABEL[w.motivoCategoria] ?? w.motivoCategoria,
        motivoDescripcion: w.motivoDescripcion,
        estadoTesisAlSolicitar: ESTADO_TESIS_LABEL[w.estadoTesisAlSolicitar] ?? w.estadoTesisAlSolicitar,
        teniaCoautor: w.teniaCoautor,
      },
      estudiante: {
        nombreCompleto: `${w.user.apellidoPaterno} ${w.user.apellidoMaterno}, ${w.user.nombres}`,
        documento: w.user.numeroDocumento,
        codigoEstudiante: w.studentCareer.codigoEstudiante,
        carrera: w.carreraNombreSnapshot,
        facultad: w.facultadSnapshot.nombre,
      },
      tesis: {
        titulo: w.thesis.titulo,
        codigo: w.thesisId.slice(-8).toUpperCase(),
      },
      coautorContinua: coautorActivo
        ? {
            nombreCompleto: `${coautorActivo.user.apellidoPaterno} ${coautorActivo.user.apellidoMaterno}, ${coautorActivo.user.nombres}`,
            codigoEstudiante: null,
          }
        : null,
    })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="acta-desistimiento-${w.thesisId.slice(-8).toUpperCase()}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[Acta desistimiento]', error)
    return NextResponse.json({ error: 'Error al generar el acta' }, { status: 500 })
  }
}
