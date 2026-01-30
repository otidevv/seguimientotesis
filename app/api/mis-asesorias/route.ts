/**
 * API Route: /api/mis-asesorias
 *
 * GET: Lista las tesis donde el docente es asesor o coasesor
 *
 * NOTA: Este endpoint está en desarrollo. La funcionalidad completa
 * requiere campos adicionales en el schema.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario es docente (tiene rol DOCENTE)
    const isDocente = user.roles?.some(
      (r) => r.role.codigo === 'DOCENTE' && r.isActive
    )
    if (!isDocente) {
      return NextResponse.json(
        { error: 'Solo los docentes pueden ver sus asesorías' },
        { status: 403 }
      )
    }

    // Obtener parámetros de filtro
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado') as 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | null

    // Obtener las tesis donde el usuario es asesor
    const asesorias = await prisma.thesisAdvisor.findMany({
      where: {
        userId: user.id,
        ...(estado && { estado }),
        thesis: {
          deletedAt: null,
        },
      },
      include: {
        thesis: {
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
                  },
                },
                studentCareer: {
                  select: {
                    codigoEstudiante: true,
                    carreraNombre: true,
                    facultad: {
                      select: {
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
                  },
                },
              },
            },
            documentos: {
              where: {
                esVersionActual: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Formatear respuesta
    const resultado = asesorias.map((asesoria) => {
      // Obtener datos del primer autor para carrera y facultad
      const primerAutor = asesoria.thesis.autores[0]
      const carreraNombre = primerAutor?.studentCareer?.carreraNombre || 'Sin carrera'
      const facultad = primerAutor?.studentCareer?.facultad

      return {
        id: asesoria.id,
        tesisId: asesoria.thesis.id,
        tipoAsesor: asesoria.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR',
        estadoAceptacion: asesoria.estado,
        fechaRespuesta: asesoria.fechaRespuesta,
        createdAt: asesoria.createdAt,
        tesis: {
          id: asesoria.thesis.id,
          codigo: asesoria.thesis.id.slice(-8).toUpperCase(),
          titulo: asesoria.thesis.titulo,
          estado: asesoria.thesis.estado,
          carreraNombre,
          facultad: facultad ? { id: facultad.nombre, nombre: facultad.nombre } : { id: '', nombre: 'Sin facultad' },
          fechaRegistro: asesoria.thesis.createdAt,
          createdAt: asesoria.thesis.createdAt,
        },
        tesistas: asesoria.thesis.autores.map((a) => ({
          id: a.id,
          tipoParticipante: a.orden === 1 ? 'AUTOR_PRINCIPAL' : 'COAUTOR',
          user: a.user || { id: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', email: '' },
          codigoEstudiante: a.studentCareer?.codigoEstudiante || 'Sin código',
          carrera: a.studentCareer?.carreraNombre || 'Sin carrera',
          facultad: a.studentCareer?.facultad?.nombre || 'Sin facultad',
        })),
        otrosAsesores: asesoria.thesis.asesores
          .filter((a) => a.userId !== user.id)
          .map((a) => ({
            id: a.id,
            tipoAsesor: a.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR',
            estado: a.estado,
            user: a.user,
          })),
        documentos: {
          tieneProyecto: asesoria.thesis.documentos.some(
            (d) => d.tipo === 'PROYECTO'
          ),
          tieneCartaAsesor: asesoria.thesis.documentos.some(
            (d) => d.tipo === 'CARTA_ACEPTACION_ASESOR'
          ),
          tieneCartaCoasesor: asesoria.thesis.documentos.some(
            (d) => d.tipo === 'CARTA_ACEPTACION_COASESOR'
          ),
        },
      }
    })

    // Contar por estado
    const conteo = {
      total: resultado.length,
      pendientes: resultado.filter((r) => r.estadoAceptacion === 'PENDIENTE').length,
      aceptadas: resultado.filter((r) => r.estadoAceptacion === 'ACEPTADO').length,
      rechazadas: resultado.filter((r) => r.estadoAceptacion === 'RECHAZADO').length,
    }

    return NextResponse.json({
      success: true,
      data: resultado,
      conteo,
    })
  } catch (error) {
    console.error('[GET /api/mis-asesorias] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener asesorías' },
      { status: 500 }
    )
  }
}
