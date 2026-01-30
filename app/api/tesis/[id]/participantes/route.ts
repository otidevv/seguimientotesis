import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT /api/tesis/[id]/participantes - Actualizar participantes (coautor o asesor)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario es el autor principal de esta tesis
    const tesis = await prisma.thesis.findFirst({
      where: {
        id,
        autores: {
          some: {
            userId: user.id,
            orden: 1, // Solo el autor principal puede modificar
          },
        },
        deletedAt: null,
      },
      include: {
        autores: true,
        asesores: true,
      },
    })

    if (!tesis) {
      return NextResponse.json(
        { error: 'Tesis no encontrada o no tienes permiso para modificarla' },
        { status: 404 }
      )
    }

    // Solo permitir cambios en estado BORRADOR u OBSERVADA
    if (!['BORRADOR', 'PROYECTO_OBSERVADO'].includes(tesis.estado)) {
      return NextResponse.json(
        { error: 'No se puede modificar participantes en el estado actual de la tesis' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { tipo, accion, participanteId, nuevoParticipanteId, studentCareerId } = body
    // tipo: 'COAUTOR' | 'ASESOR' | 'COASESOR'
    // accion: 'REEMPLAZAR' | 'ELIMINAR'
    // participanteId: ID del registro actual a reemplazar/eliminar
    // nuevoParticipanteId: userId del nuevo participante (solo para REEMPLAZAR)
    // studentCareerId: ID específico del StudentCareer a usar (para coautores)

    if (!tipo || !accion) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (tipo, accion)' },
        { status: 400 }
      )
    }

    if (accion === 'REEMPLAZAR' && !nuevoParticipanteId) {
      return NextResponse.json(
        { error: 'Debe especificar el nuevo participante' },
        { status: 400 }
      )
    }

    // Manejar según el tipo de participante
    if (tipo === 'COAUTOR') {
      // Buscar el coautor actual
      const coautorActual = tesis.autores.find(
        (a) => a.orden > 1 && (participanteId ? a.id === participanteId : true)
      )

      if (!coautorActual) {
        return NextResponse.json(
          { error: 'No se encontró el coautor a modificar' },
          { status: 404 }
        )
      }

      // Solo permitir cambio si fue rechazado o está pendiente
      if (coautorActual.estado === 'ACEPTADO') {
        return NextResponse.json(
          { error: 'No se puede reemplazar un coautor que ya aceptó' },
          { status: 400 }
        )
      }

      if (accion === 'ELIMINAR') {
        // Eliminar el coautor
        await prisma.thesisAuthor.delete({
          where: { id: coautorActual.id },
        })

        // Registrar en historial
        await prisma.thesisStatusHistory.create({
          data: {
            thesisId: tesis.id,
            estadoNuevo: tesis.estado,
            comentario: 'Coautor eliminado del proyecto',
            changedById: user.id,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Coautor eliminado exitosamente',
        })
      }

      if (accion === 'REEMPLAZAR') {
        // Obtener la carrera del autor principal para validar
        const autorPrincipal = tesis.autores.find((a) => a.orden === 1)
        if (!autorPrincipal) {
          return NextResponse.json(
            { error: 'No se encontró el autor principal' },
            { status: 400 }
          )
        }

        const carreraAutorPrincipal = await prisma.studentCareer.findUnique({
          where: { id: autorPrincipal.studentCareerId },
          select: { carreraNombre: true, facultadId: true },
        })

        // Verificar que el nuevo participante es estudiante de la misma carrera
        let nuevoCoautorCareer
        if (studentCareerId) {
          // Si se proporciona el studentCareerId específico, usarlo
          nuevoCoautorCareer = await prisma.studentCareer.findFirst({
            where: {
              id: studentCareerId,
              userId: nuevoParticipanteId,
              isActive: true,
            },
          })
        } else {
          // Buscar uno que coincida con la carrera del autor principal
          nuevoCoautorCareer = await prisma.studentCareer.findFirst({
            where: {
              userId: nuevoParticipanteId,
              isActive: true,
              carreraNombre: carreraAutorPrincipal?.carreraNombre,
            },
          })
        }

        if (!nuevoCoautorCareer) {
          return NextResponse.json(
            { error: 'El nuevo coautor no tiene información de carrera activa o no es de la misma carrera' },
            { status: 400 }
          )
        }

        // Validar que sea de la misma carrera
        if (carreraAutorPrincipal && nuevoCoautorCareer.carreraNombre !== carreraAutorPrincipal.carreraNombre) {
          return NextResponse.json(
            { error: `El coautor debe ser de la misma carrera (${carreraAutorPrincipal.carreraNombre})` },
            { status: 400 }
          )
        }

        // Verificar que no sea el mismo autor principal
        if (nuevoParticipanteId === user.id) {
          return NextResponse.json(
            { error: 'No puedes agregarte a ti mismo como coautor' },
            { status: 400 }
          )
        }

        // Eliminar el coautor anterior
        await prisma.thesisAuthor.delete({
          where: { id: coautorActual.id },
        })

        // Crear el nuevo coautor con estado PENDIENTE
        await prisma.thesisAuthor.create({
          data: {
            thesisId: tesis.id,
            userId: nuevoParticipanteId,
            studentCareerId: nuevoCoautorCareer.id,
            orden: 2,
            estado: 'PENDIENTE',
          },
        })

        // Registrar en historial
        await prisma.thesisStatusHistory.create({
          data: {
            thesisId: tesis.id,
            estadoNuevo: tesis.estado,
            comentario: 'Coautor reemplazado - nueva invitación enviada',
            changedById: user.id,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Coautor reemplazado. Se ha enviado una nueva invitación.',
        })
      }
    }

    if (tipo === 'ASESOR' || tipo === 'COASESOR') {
      const tipoAsesorDB = tipo === 'ASESOR' ? 'PRINCIPAL' : 'CO_ASESOR'

      // Buscar el asesor actual
      const asesorActual = tesis.asesores.find(
        (a) => a.tipo === tipoAsesorDB && (participanteId ? a.id === participanteId : true)
      )

      if (!asesorActual) {
        return NextResponse.json(
          { error: `No se encontró el ${tipo.toLowerCase()} a modificar` },
          { status: 404 }
        )
      }

      // Solo permitir cambio si fue rechazado o está pendiente
      if (asesorActual.estado === 'ACEPTADO') {
        return NextResponse.json(
          { error: `No se puede reemplazar un ${tipo.toLowerCase()} que ya aceptó` },
          { status: 400 }
        )
      }

      if (accion === 'ELIMINAR') {
        // No permitir eliminar el asesor principal
        if (tipo === 'ASESOR') {
          return NextResponse.json(
            { error: 'No se puede eliminar el asesor principal. Debe reemplazarlo.' },
            { status: 400 }
          )
        }

        // Eliminar el coasesor
        await prisma.thesisAdvisor.delete({
          where: { id: asesorActual.id },
        })

        // Registrar en historial
        await prisma.thesisStatusHistory.create({
          data: {
            thesisId: tesis.id,
            estadoNuevo: tesis.estado,
            comentario: 'Coasesor eliminado del proyecto',
            changedById: user.id,
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Coasesor eliminado exitosamente',
        })
      }

      if (accion === 'REEMPLAZAR') {
        // Verificar que el nuevo participante es docente
        const nuevoDocente = await prisma.teacherInfo.findFirst({
          where: {
            userId: nuevoParticipanteId,
            user: {
              isActive: true,
              roles: {
                some: {
                  role: { codigo: 'DOCENTE' },
                  isActive: true,
                },
              },
            },
          },
        })

        if (!nuevoDocente) {
          return NextResponse.json(
            { error: 'El nuevo asesor no es un docente válido' },
            { status: 400 }
          )
        }

        // Verificar que no sea el mismo que otro asesor existente
        const otroAsesor = tesis.asesores.find(
          (a) => a.userId === nuevoParticipanteId && a.id !== asesorActual.id
        )
        if (otroAsesor) {
          return NextResponse.json(
            { error: 'Este docente ya es asesor de esta tesis' },
            { status: 400 }
          )
        }

        // Eliminar el asesor anterior
        await prisma.thesisAdvisor.delete({
          where: { id: asesorActual.id },
        })

        // Crear el nuevo asesor con estado PENDIENTE
        await prisma.thesisAdvisor.create({
          data: {
            thesisId: tesis.id,
            userId: nuevoParticipanteId,
            tipo: tipoAsesorDB,
            estado: 'PENDIENTE',
          },
        })

        // Registrar en historial
        await prisma.thesisStatusHistory.create({
          data: {
            thesisId: tesis.id,
            estadoNuevo: tesis.estado,
            comentario: `${tipo === 'ASESOR' ? 'Asesor' : 'Coasesor'} reemplazado - nueva invitación enviada`,
            changedById: user.id,
          },
        })

        return NextResponse.json({
          success: true,
          message: `${tipo === 'ASESOR' ? 'Asesor' : 'Coasesor'} reemplazado. Se ha enviado una nueva invitación.`,
        })
      }
    }

    return NextResponse.json(
      { error: 'Tipo de participante no válido' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[PUT /api/tesis/[id]/participantes] Error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar participante' },
      { status: 500 }
    )
  }
}

// POST /api/tesis/[id]/participantes - Agregar nuevo participante
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario es el autor principal de esta tesis
    const tesis = await prisma.thesis.findFirst({
      where: {
        id,
        autores: {
          some: {
            userId: user.id,
            orden: 1,
          },
        },
        deletedAt: null,
      },
      include: {
        autores: true,
        asesores: true,
      },
    })

    if (!tesis) {
      return NextResponse.json(
        { error: 'Tesis no encontrada o no tienes permiso para modificarla' },
        { status: 404 }
      )
    }

    if (!['BORRADOR', 'PROYECTO_OBSERVADO'].includes(tesis.estado)) {
      return NextResponse.json(
        { error: 'No se puede agregar participantes en el estado actual de la tesis' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { tipo, participanteId, studentCareerId } = body
    // tipo: 'COAUTOR' | 'COASESOR'
    // participanteId: userId del nuevo participante
    // studentCareerId: ID específico del StudentCareer a usar (para coautores)

    if (!tipo || !participanteId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    if (tipo === 'COAUTOR') {
      // Verificar que no existe ya un coautor
      const coautorExistente = tesis.autores.find((a) => a.orden > 1)
      if (coautorExistente) {
        return NextResponse.json(
          { error: 'Ya existe un coautor. Use la opción de reemplazar.' },
          { status: 400 }
        )
      }

      // Obtener la carrera del autor principal para validar
      const autorPrincipal = tesis.autores.find((a) => a.orden === 1)
      if (!autorPrincipal) {
        return NextResponse.json(
          { error: 'No se encontró el autor principal' },
          { status: 400 }
        )
      }

      const carreraAutorPrincipal = await prisma.studentCareer.findUnique({
        where: { id: autorPrincipal.studentCareerId },
        select: { carreraNombre: true },
      })

      // Obtener carrera del estudiante (debe ser la misma que el autor principal)
      let studentCareer
      if (studentCareerId) {
        studentCareer = await prisma.studentCareer.findFirst({
          where: {
            id: studentCareerId,
            userId: participanteId,
            isActive: true,
          },
        })
      } else {
        studentCareer = await prisma.studentCareer.findFirst({
          where: {
            userId: participanteId,
            isActive: true,
            carreraNombre: carreraAutorPrincipal?.carreraNombre,
          },
        })
      }

      if (!studentCareer) {
        return NextResponse.json(
          { error: `El estudiante no tiene información de carrera activa o no es de la misma carrera (${carreraAutorPrincipal?.carreraNombre || 'desconocida'})` },
          { status: 400 }
        )
      }

      // Validar que sea de la misma carrera
      if (carreraAutorPrincipal && studentCareer.carreraNombre !== carreraAutorPrincipal.carreraNombre) {
        return NextResponse.json(
          { error: `El coautor debe ser de la misma carrera (${carreraAutorPrincipal.carreraNombre})` },
          { status: 400 }
        )
      }

      await prisma.thesisAuthor.create({
        data: {
          thesisId: tesis.id,
          userId: participanteId,
          studentCareerId: studentCareer.id,
          orden: 2,
          estado: 'PENDIENTE',
        },
      })

      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: tesis.id,
          estadoNuevo: tesis.estado,
          comentario: 'Coautor agregado - invitación enviada',
          changedById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Coautor agregado. Se ha enviado una invitación.',
      })
    }

    if (tipo === 'COASESOR') {
      // Verificar que no existe ya un coasesor
      const coasesorExistente = tesis.asesores.find((a) => a.tipo === 'CO_ASESOR')
      if (coasesorExistente) {
        return NextResponse.json(
          { error: 'Ya existe un coasesor. Use la opción de reemplazar.' },
          { status: 400 }
        )
      }

      // Verificar que es docente
      const docente = await prisma.teacherInfo.findFirst({
        where: {
          userId: participanteId,
          user: {
            isActive: true,
            roles: {
              some: {
                role: { codigo: 'DOCENTE' },
                isActive: true,
              },
            },
          },
        },
      })

      if (!docente) {
        return NextResponse.json(
          { error: 'El usuario no es un docente válido' },
          { status: 400 }
        )
      }

      // Verificar que no sea el mismo asesor principal
      const asesorPrincipal = tesis.asesores.find((a) => a.tipo === 'PRINCIPAL')
      if (asesorPrincipal?.userId === participanteId) {
        return NextResponse.json(
          { error: 'El coasesor no puede ser el mismo que el asesor principal' },
          { status: 400 }
        )
      }

      await prisma.thesisAdvisor.create({
        data: {
          thesisId: tesis.id,
          userId: participanteId,
          tipo: 'CO_ASESOR',
          estado: 'PENDIENTE',
        },
      })

      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: tesis.id,
          estadoNuevo: tesis.estado,
          comentario: 'Coasesor agregado - invitación enviada',
          changedById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Coasesor agregado. Se ha enviado una invitación.',
      })
    }

    return NextResponse.json(
      { error: 'Tipo de participante no válido' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[POST /api/tesis/[id]/participantes] Error:', error)
    return NextResponse.json(
      { error: 'Error al agregar participante' },
      { status: 500 }
    )
  }
}
