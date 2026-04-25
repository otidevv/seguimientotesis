import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'

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
            estado: 'ACEPTADO', // Y debe estar activo (no desistido/pendiente/rechazado)
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

    // Bloquear explícitamente si hay solicitud de desistimiento pendiente
    if (tesis.estado === 'SOLICITUD_DESISTIMIENTO') {
      return NextResponse.json(
        { error: 'Hay una solicitud de desistimiento pendiente. Resuélvela antes de modificar participantes.' },
        { status: 409 }
      )
    }
    // Solo permitir cambios en estado BORRADOR, OBSERVADA, OBSERVADA_JURADO o ASIGNANDO_JURADOS
    if (!['BORRADOR', 'OBSERVADA', 'OBSERVADA_JURADO', 'ASIGNANDO_JURADOS'].includes(tesis.estado)) {
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
      // Bloqueo por resolución de jurado: si ya se emitió la RESOLUCION_JURADO,
      // los nombres de los autores quedaron formalizados ahí. La composición no
      // puede cambiar por sistema; un cambio requiere desistimiento formal +
      // RESOLUCION_DESISTIMIENTO emitida por mesa de partes.
      const tieneResolucionJurado = await prisma.thesisDocument.findFirst({
        where: { thesisId: tesis.id, tipo: 'RESOLUCION_JURADO' },
        select: { id: true },
      })
      if (tieneResolucionJurado) {
        return NextResponse.json(
          {
            error: 'No se puede modificar el coautor: ya existe la resolución de conformación de jurado con los nombres de los tesistas. Si un coautor desea retirarse, debe iniciar una solicitud de desistimiento.',
          },
          { status: 409 }
        )
      }

      // Buscar el coautor actual (excluye desistidos — son históricos)
      const coautorActual = tesis.autores.find(
        (a) => a.orden > 1 && a.estado !== 'DESISTIDO' && (participanteId ? a.id === participanteId : true)
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
        // Limpiar solicitudes de desistimiento fantasma (rechazadas/canceladas)
        // que bloquearían la eliminación por FK Restrict
        await prisma.thesisWithdrawal.deleteMany({
          where: {
            thesisAuthorId: coautorActual.id,
            estadoSolicitud: { in: ['RECHAZADO', 'CANCELADO'] },
          },
        })
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

        // Si el NUEVO participante ya desistió formalmente de ESTA tesis,
        // bloquear la invitación antes de tocar al coautor actual.
        const taPrevio = await prisma.thesisAuthor.findUnique({
          where: { thesisId_userId: { thesisId: tesis.id, userId: nuevoParticipanteId } },
        })
        if (taPrevio?.estado === 'DESISTIDO') {
          return NextResponse.json(
            { error: 'Este estudiante ya desistió formalmente de esta tesis. No puede ser reincorporado.' },
            { status: 409 }
          )
        }

        // Caso borde: "reemplazar" al coautor actual consigo mismo (misma persona).
        // Sin esta rama borraríamos su fila y luego el update fallaría con P2025.
        // Lo tratamos como una reinvitación: resetear estado a PENDIENTE en la fila existente.
        if (taPrevio && taPrevio.id === coautorActual.id) {
          await prisma.thesisWithdrawal.deleteMany({
            where: {
              thesisAuthorId: coautorActual.id,
              estadoSolicitud: { in: ['RECHAZADO', 'CANCELADO'] },
            },
          })
          await prisma.thesisAuthor.update({
            where: { id: taPrevio.id },
            data: {
              estado: 'PENDIENTE',
              orden: 2,
              studentCareerId: nuevoCoautorCareer.id,
              fechaRespuesta: null,
              motivoRechazo: null,
            },
          })
        } else {
          // Reemplazo real con otra persona.
          await prisma.thesisWithdrawal.deleteMany({
            where: {
              thesisAuthorId: coautorActual.id,
              estadoSolicitud: { in: ['RECHAZADO', 'CANCELADO'] },
            },
          })
          await prisma.thesisAuthor.delete({
            where: { id: coautorActual.id },
          })

          if (taPrevio) {
            await prisma.thesisAuthor.update({
              where: { id: taPrevio.id },
              data: {
                estado: 'PENDIENTE',
                orden: 2,
                studentCareerId: nuevoCoautorCareer.id,
                fechaRespuesta: null,
                motivoRechazo: null,
              },
            })
          } else {
            await prisma.thesisAuthor.create({
              data: {
                thesisId: tesis.id,
                userId: nuevoParticipanteId,
                studentCareerId: nuevoCoautorCareer.id,
                orden: 2,
                estado: 'PENDIENTE',
              },
            })
          }
        }

        // Registrar en historial
        await prisma.thesisStatusHistory.create({
          data: {
            thesisId: tesis.id,
            estadoNuevo: tesis.estado,
            comentario: 'Coautor reemplazado - nueva invitación enviada',
            changedById: user.id,
          },
        })

        // Notificar al nuevo coautor invitado
        await crearNotificacion({
          userId: nuevoParticipanteId,
          tipo: 'INVITACION_COAUTOR',
          titulo: 'Invitación como coautor de tesis',
          mensaje: `Has sido invitado como coautor en la tesis "${tesis.titulo}". Ingresa a Mis Tesis para aceptar o rechazar la invitación.`,
          enlace: `/mis-tesis/${tesis.id}`,
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

        // Notificar al nuevo asesor/coasesor
        const tipoLabel = tipo === 'ASESOR' ? 'asesor' : 'coasesor'
        await crearNotificacion({
          userId: nuevoParticipanteId,
          tipo: tipo === 'ASESOR' ? 'INVITACION_ASESOR' : 'INVITACION_COASESOR',
          titulo: `Invitación como ${tipoLabel} de tesis`,
          mensaje: `Has sido invitado como ${tipoLabel} en la tesis "${tesis.titulo}". Ingresa a Mis Asesorías para aceptar o rechazar.`,
          enlace: `/mis-asesorias`,
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
    // FK Restrict: el participante tiene un desistimiento aprobado asociado (histórico)
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('Foreign key') || msg.includes('thesis_withdrawals')) {
      return NextResponse.json(
        { error: 'No se puede modificar este participante porque tiene un desistimiento registrado en el historial.' },
        { status: 409 }
      )
    }
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

    if (!['BORRADOR', 'OBSERVADA', 'OBSERVADA_JURADO', 'ASIGNANDO_JURADOS'].includes(tesis.estado)) {
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
      // Bloqueo por resolución de jurado: si ya se emitió la RESOLUCION_JURADO,
      // los nombres de los autores quedaron formalizados ahí. No se admite agregar
      // un nuevo coautor — un cambio de composición requiere desistimiento formal.
      const tieneResolucionJurado = await prisma.thesisDocument.findFirst({
        where: { thesisId: tesis.id, tipo: 'RESOLUCION_JURADO' },
        select: { id: true },
      })
      if (tieneResolucionJurado) {
        return NextResponse.json(
          {
            error: 'No se puede agregar un coautor: ya existe la resolución de conformación de jurado con los nombres de los tesistas.',
          },
          { status: 409 }
        )
      }

      // Verificar que no existe ya un coautor activo (los desistidos son históricos)
      const coautorExistente = tesis.autores.find((a) => a.orden > 1 && a.estado !== 'DESISTIDO')
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

      // Si el usuario YA tuvo un registro en esta tesis (p.ej. DESISTIDO histórico
      // o RECHAZADO), no podemos crear otro (unique[thesisId, userId]).
      // Reactivamos el existente como PENDIENTE preservando el ThesisWithdrawal
      // histórico que esté vinculado.
      const taPrevio = await prisma.thesisAuthor.findUnique({
        where: { thesisId_userId: { thesisId: tesis.id, userId: participanteId } },
      })

      // Bloquear reincorporación de quien ya desistió formalmente de ESTA tesis:
      // el desistimiento es un compromiso roto con resolución de mesa de partes;
      // volver a invitarlo anularía el valor formal del proceso.
      if (taPrevio?.estado === 'DESISTIDO') {
        return NextResponse.json(
          { error: 'Este estudiante ya desistió formalmente de esta tesis. No puede ser reincorporado.' },
          { status: 409 }
        )
      }

      let comentarioHist = 'Coautor agregado - invitación enviada'
      if (taPrevio) {
        // Reactivar registro previo (RECHAZADO / CANCELADO de invitación anterior).
        await prisma.thesisAuthor.update({
          where: { id: taPrevio.id },
          data: {
            estado: 'PENDIENTE',
            orden: 2,
            studentCareerId: studentCareer.id,
            fechaRespuesta: null,
            motivoRechazo: null,
          },
        })
        comentarioHist = 'Coautor reinvitado - invitación enviada'
      } else {
        await prisma.thesisAuthor.create({
          data: {
            thesisId: tesis.id,
            userId: participanteId,
            studentCareerId: studentCareer.id,
            orden: 2,
            estado: 'PENDIENTE',
          },
        })
      }

      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: tesis.id,
          estadoNuevo: tesis.estado,
          comentario: comentarioHist,
          changedById: user.id,
        },
      })

      // Notificar al coautor invitado
      await crearNotificacion({
        userId: participanteId,
        tipo: 'INVITACION_COAUTOR',
        titulo: 'Invitación como coautor de tesis',
        mensaje: `Has sido invitado como coautor en la tesis "${tesis.titulo}". Ingresa a Mis Tesis para aceptar o rechazar la invitación.`,
        enlace: `/mis-tesis/${tesis.id}`,
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

      // Notificar al coasesor invitado
      await crearNotificacion({
        userId: participanteId,
        tipo: 'INVITACION_COASESOR',
        titulo: 'Invitación como coasesor de tesis',
        mensaje: `Has sido invitado como coasesor en la tesis "${tesis.titulo}". Ingresa a Mis Asesorías para aceptar o rechazar la invitación.`,
        enlace: `/mis-asesorias`,
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
