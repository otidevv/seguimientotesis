/**
 * API Route: /api/mis-asesorias/[id]
 *
 * GET: Obtiene detalles de una tesis específica donde el docente es asesor
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request)
    const { id: tesisId } = await params

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario es docente o externo
    const isDocenteOExterno = user.roles?.some(
      (r) => ['DOCENTE', 'EXTERNO'].includes(r.role.codigo) && r.isActive
    )
    if (!isDocenteOExterno) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver asesorías' },
        { status: 403 }
      )
    }

    // Obtener la tesis
    const tesis = await prisma.thesis.findUnique({
      where: { id: tesisId, deletedAt: null },
      include: {
        autores: {
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                email: true,
                numeroDocumento: true,
              },
            },
            studentCareer: {
              select: {
                codigoEstudiante: true,
                carreraNombre: true,
                facultad: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
            },
          },
          orderBy: { orden: 'asc' },
        },
        asesores: {
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                email: true,
              },
            },
          },
        },
        documentos: {
          where: {
            esVersionActual: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario es asesor de esta tesis
    const asesorRegistro = tesis.asesores.find((a) => a.userId === user.id)

    if (!asesorRegistro) {
      return NextResponse.json(
        { error: 'No eres asesor de esta tesis' },
        { status: 403 }
      )
    }

    // Obtener la facultad del primer autor (para mostrar la carrera/facultad)
    const primerAutor = tesis.autores[0]
    const facultadInfo = primerAutor?.studentCareer?.facultad

    // Formatear respuesta
    const carreraNombre = primerAutor?.studentCareer?.carreraNombre || 'Sin carrera'

    const resultado = {
      asesoria: {
        id: asesorRegistro.id,
        tipoAsesor: asesorRegistro.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR',
        estado: asesorRegistro.estado,
        fechaRespuesta: asesorRegistro.fechaRespuesta,
        motivoRechazo: null,
      },
      tesis: {
        id: tesis.id,
        codigo: tesis.id.slice(-8).toUpperCase(),
        titulo: tesis.titulo,
        resumen: tesis.resumen,
        palabrasClave: tesis.palabrasClave,
        lineaInvestigacion: tesis.lineaInvestigacion,
        estado: tesis.estado,
        carreraNombre,
        fechaRegistro: tesis.createdAt,
        createdAt: tesis.createdAt,
        facultad: facultadInfo ? {
          id: facultadInfo.id,
          nombre: facultadInfo.nombre,
        } : { id: '', nombre: 'Sin facultad' },
      },
      tesistas: tesis.autores.map((a) => ({
        id: a.id,
        tipoParticipante: a.orden === 1 ? 'AUTOR_PRINCIPAL' : 'COAUTOR',
        orden: a.orden,
        user: a.user,
        codigoEstudiante: a.studentCareer?.codigoEstudiante || 'Sin código',
        carrera: a.studentCareer?.carreraNombre || 'Sin carrera',
      })),
      asesores: tesis.asesores.map((a) => ({
        id: a.id,
        tipoAsesor: a.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR',
        estado: a.estado,
        fechaRespuesta: a.fechaRespuesta,
        user: a.user,
        esMiRegistro: a.userId === user.id,
      })),
      documentos: tesis.documentos.map((d) => ({
        id: d.id,
        tipoDocumento: d.tipo,
        nombre: d.nombre,
        descripcion: d.descripcion,
        archivoUrl: d.rutaArchivo,
        archivoNombre: d.nombre,
        archivoTamano: d.tamano,
        version: d.version,
        firmadoDigitalmente: d.firmadoDigitalmente,
        createdAt: d.createdAt,
      })),
    }

    return NextResponse.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    console.error('[GET /api/mis-asesorias/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener detalles de asesoría' },
      { status: 500 }
    )
  }
}
