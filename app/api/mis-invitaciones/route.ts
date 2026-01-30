import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/mis-invitaciones - Listar invitaciones pendientes del usuario (coautor y asesor)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const invitaciones: any[] = []

    // ==========================================
    // 1. Buscar invitaciones como COAUTOR
    // ==========================================
    const invitacionesCoautor = await prisma.thesisAuthor.findMany({
      where: {
        userId: user.id,
        orden: { gt: 1 }, // Solo coautores, no el autor principal
        thesis: {
          deletedAt: null,
        },
      },
      include: {
        thesis: {
          select: {
            id: true,
            titulo: true,
            resumen: true,
            lineaInvestigacion: true,
            estado: true,
            createdAt: true,
            autores: {
              where: {
                orden: 1, // Solo el autor principal
              },
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
          },
        },
        studentCareer: {
          select: {
            codigoEstudiante: true,
            carreraNombre: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Formatear invitaciones de coautor
    for (const inv of invitacionesCoautor) {
      const autorPrincipal = inv.thesis.autores[0]
      const facultad = autorPrincipal?.studentCareer?.facultad

      invitaciones.push({
        id: inv.id,
        tipoInvitacion: 'COAUTOR', // Nuevo campo para distinguir
        estado: inv.estado,
        fechaRespuesta: inv.fechaRespuesta,
        motivoRechazo: inv.motivoRechazo,
        createdAt: inv.createdAt,
        tesis: {
          id: inv.thesis.id,
          codigo: inv.thesis.id.slice(-8).toUpperCase(),
          titulo: inv.thesis.titulo,
          resumen: inv.thesis.resumen,
          lineaInvestigacion: inv.thesis.lineaInvestigacion,
          estado: inv.thesis.estado,
          carreraNombre: autorPrincipal?.studentCareer?.carreraNombre || 'Sin carrera',
          facultad: facultad || { id: '', nombre: 'Sin facultad' },
          createdAt: inv.thesis.createdAt,
        },
        autorPrincipal: autorPrincipal?.user
          ? {
              id: autorPrincipal.user.id,
              nombres: autorPrincipal.user.nombres,
              apellidoPaterno: autorPrincipal.user.apellidoPaterno,
              apellidoMaterno: autorPrincipal.user.apellidoMaterno,
              email: autorPrincipal.user.email,
            }
          : null,
        asesores: inv.thesis.asesores.map((a) => ({
          id: a.id,
          tipoAsesor: a.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR',
          estado: a.estado,
          user: {
            id: a.user.id,
            nombres: a.user.nombres,
            apellidoPaterno: a.user.apellidoPaterno,
            apellidoMaterno: a.user.apellidoMaterno,
          },
        })),
        miCarrera: {
          codigoEstudiante: inv.studentCareer?.codigoEstudiante || 'Sin código',
          carreraNombre: inv.studentCareer?.carreraNombre || 'Sin carrera',
        },
      })
    }

    // ==========================================
    // 2. Buscar invitaciones como ASESOR/COASESOR
    // ==========================================
    const invitacionesAsesor = await prisma.thesisAdvisor.findMany({
      where: {
        userId: user.id,
        thesis: {
          deletedAt: null,
        },
      },
      include: {
        thesis: {
          select: {
            id: true,
            titulo: true,
            resumen: true,
            lineaInvestigacion: true,
            estado: true,
            createdAt: true,
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
                    carreraNombre: true,
                    codigoEstudiante: true,
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
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Formatear invitaciones de asesor
    for (const inv of invitacionesAsesor) {
      const autorPrincipal = inv.thesis.autores[0]
      const facultad = autorPrincipal?.studentCareer?.facultad
      const tipoAsesorLabel = inv.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR'

      invitaciones.push({
        id: inv.id,
        tipoInvitacion: tipoAsesorLabel, // 'ASESOR' o 'COASESOR'
        estado: inv.estado,
        fechaRespuesta: inv.fechaRespuesta,
        motivoRechazo: null, // Los asesores no tienen motivo de rechazo guardado por ahora
        createdAt: inv.createdAt,
        tesis: {
          id: inv.thesis.id,
          codigo: inv.thesis.id.slice(-8).toUpperCase(),
          titulo: inv.thesis.titulo,
          resumen: inv.thesis.resumen,
          lineaInvestigacion: inv.thesis.lineaInvestigacion,
          estado: inv.thesis.estado,
          carreraNombre: autorPrincipal?.studentCareer?.carreraNombre || 'Sin carrera',
          facultad: facultad || { id: '', nombre: 'Sin facultad' },
          createdAt: inv.thesis.createdAt,
        },
        autorPrincipal: autorPrincipal?.user
          ? {
              id: autorPrincipal.user.id,
              nombres: autorPrincipal.user.nombres,
              apellidoPaterno: autorPrincipal.user.apellidoPaterno,
              apellidoMaterno: autorPrincipal.user.apellidoMaterno,
              email: autorPrincipal.user.email,
            }
          : null,
        // Para asesores, mostrar los tesistas
        tesistas: inv.thesis.autores.map((a) => ({
          id: a.id,
          orden: a.orden,
          codigoEstudiante: a.studentCareer?.codigoEstudiante || 'Sin código',
          user: {
            id: a.user.id,
            nombres: a.user.nombres,
            apellidoPaterno: a.user.apellidoPaterno,
            apellidoMaterno: a.user.apellidoMaterno,
            email: a.user.email,
          },
        })),
        // Otros asesores (excluyendo al usuario actual)
        asesores: inv.thesis.asesores
          .filter((a) => a.userId !== user.id)
          .map((a) => ({
            id: a.id,
            tipoAsesor: a.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR',
            estado: a.estado,
            user: {
              id: a.user.id,
              nombres: a.user.nombres,
              apellidoPaterno: a.user.apellidoPaterno,
              apellidoMaterno: a.user.apellidoMaterno,
            },
          })),
        miCarrera: null, // Los asesores no tienen carrera asociada a la invitación
      })
    }

    // Ordenar todas las invitaciones por fecha (más recientes primero)
    invitaciones.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Calcular conteos
    const conteo = {
      total: invitaciones.length,
      pendientes: invitaciones.filter((i) => i.estado === 'PENDIENTE').length,
      aceptadas: invitaciones.filter((i) => i.estado === 'ACEPTADO').length,
      rechazadas: invitaciones.filter((i) => i.estado === 'RECHAZADO').length,
    }

    return NextResponse.json({
      success: true,
      data: invitaciones,
      conteo,
    })
  } catch (error) {
    console.error('[GET /api/mis-invitaciones] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener invitaciones' },
      { status: 500 }
    )
  }
}
