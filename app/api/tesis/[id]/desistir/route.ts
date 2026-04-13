import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'

// Estados en los que el tesista puede solicitar desistimiento
// Solo fase de gestión de proyecto (antes de informe final)
const ESTADOS_PERMITIDOS = [
  'BORRADOR',
  'EN_REVISION',
  'OBSERVADA',
  'ASIGNANDO_JURADOS',
  'EN_EVALUACION_JURADO',
  'OBSERVADA_JURADO',
  'PROYECTO_APROBADO',
]

// POST /api/tesis/[id]/desistir - Desistir de la tesis
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

    const body = await request.json()
    const { motivo } = body

    if (!motivo?.trim()) {
      return NextResponse.json(
        { error: 'Debe indicar el motivo del desistimiento' },
        { status: 400 }
      )
    }

    if (motivo.trim().length < 10) {
      return NextResponse.json(
        { error: 'El motivo debe tener al menos 10 caracteres' },
        { status: 400 }
      )
    }

    // Obtener la tesis verificando que el usuario es autor activo (no desistido)
    const tesis = await prisma.thesis.findFirst({
      where: {
        id,
        deletedAt: null,
        autores: {
          some: {
            userId: user.id,
            estado: { in: ['PENDIENTE', 'ACEPTADO'] },
          },
        },
      },
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
                carreraNombre: true,
                facultad: {
                  select: { nombre: true, codigo: true },
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
                email: true,
              },
            },
          },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json(
        { error: 'Tesis no encontrada o no eres autor de esta tesis' },
        { status: 404 }
      )
    }

    // Validar que el estado actual permite desistimiento
    if (!ESTADOS_PERMITIDOS.includes(tesis.estado)) {
      return NextResponse.json(
        { error: `No se puede desistir de una tesis en estado "${tesis.estado}". Solo es posible antes de la sustentación.` },
        { status: 400 }
      )
    }

    const miRegistro = tesis.autores.find(a => a.user.id === user.id && a.estado !== 'DESISTIDO' && a.estado !== 'RECHAZADO')
    if (!miRegistro) {
      return NextResponse.json(
        { error: 'No se encontró tu registro como autor' },
        { status: 404 }
      )
    }

    const nombreDesistente = `${miRegistro.user.nombres} ${miRegistro.user.apellidoPaterno}`
    const asesorIds = tesis.asesores.map(a => a.user.id)

    // Coautores activos (excluyendo al que desiste)
    const coautoresActivos = tesis.autores.filter(
      a => a.user.id !== user.id && a.estado === 'ACEPTADO'
    )

    if (coautoresActivos.length > 0) {
      // ─── CASO 1: Hay coautor(es) → el tesista desiste, tesis continúa ───
      const nuevoAutorPrincipal = coautoresActivos[0]
      const nombreNuevoPrincipal = `${nuevoAutorPrincipal.user.nombres} ${nuevoAutorPrincipal.user.apellidoPaterno}`

      // Determinar a qué estado retrocede según la fase actual:
      // - EN_REVISION/OBSERVADA → BORRADOR (para que el nuevo autor gestione documentos y reenvíe)
      // - ASIGNANDO_JURADOS+ → ASIGNANDO_JURADOS (para actualizar resolución)
      // - BORRADOR → se queda en BORRADOR
      const ESTADOS_RETROCEDE_BORRADOR = ['EN_REVISION', 'OBSERVADA']
      const ESTADOS_RETROCEDE_JURADOS = [
        'ASIGNANDO_JURADOS', 'EN_EVALUACION_JURADO', 'OBSERVADA_JURADO', 'PROYECTO_APROBADO',
      ]
      let nuevoEstado = tesis.estado
      if (ESTADOS_RETROCEDE_BORRADOR.includes(tesis.estado)) {
        nuevoEstado = 'BORRADOR'
      } else if (ESTADOS_RETROCEDE_JURADOS.includes(tesis.estado)) {
        nuevoEstado = 'ASIGNANDO_JURADOS'
      }
      const necesitaRetroceder = nuevoEstado !== tesis.estado

      // Usar SQL raw para DESISTIDO porque Prisma Client no reconoce los enums nuevos
      await prisma.$transaction(async (tx) => {
        // Marcar al autor como DESISTIDO
        await tx.$executeRawUnsafe(
          `UPDATE thesis_authors SET estado = 'DESISTIDO', orden = 99, fecha_respuesta = NOW(), motivo_rechazo = $1 WHERE id = $2`,
          motivo.trim(), miRegistro.id
        )
        // Promover al coautor como autor principal
        await tx.thesisAuthor.update({
          where: { id: nuevoAutorPrincipal.id },
          data: { orden: 1 },
        })
        // Cambiar estado de la tesis si es necesario
        if (necesitaRetroceder) {
          await tx.thesis.update({
            where: { id },
            data: {
              estado: nuevoEstado as any,
              fechaLimiteEvaluacion: null,
              fechaLimiteCorreccion: null,
            },
          })
        }
        // Registrar en historial
        await tx.thesisStatusHistory.create({
          data: {
            thesisId: id,
            estadoAnterior: tesis.estado,
            estadoNuevo: nuevoEstado,
            comentario: necesitaRetroceder
              ? `Desistimiento de ${nombreDesistente}. Motivo: ${motivo.trim()}. ${nombreNuevoPrincipal} asume como autor principal. La tesis retrocede a ${nuevoEstado === 'BORRADOR' ? 'Borrador para actualizar documentos' : 'Asignando Jurados para actualizar la resolución'}.`
              : `Desistimiento de ${nombreDesistente}. Motivo: ${motivo.trim()}. ${nombreNuevoPrincipal} asume como autor principal.`,
            changedById: user.id,
          },
        })
      })

      // Notificar al nuevo autor principal
      const mensajeNotif = nuevoEstado === 'BORRADOR'
        ? `${nombreDesistente} ha desistido de la tesis "${tesis.titulo}". Ahora eres el autor principal. Debes subir tu documento sustentatorio, agregar un nuevo coautor si lo deseas, y reenviar a revisión.`
        : nuevoEstado === 'ASIGNANDO_JURADOS'
          ? `${nombreDesistente} ha desistido de la tesis "${tesis.titulo}". Ahora eres el autor principal. Mesa de partes debe actualizar la resolución. Puedes agregar un nuevo coautor si lo deseas.`
          : `${nombreDesistente} ha desistido de la tesis "${tesis.titulo}". Ahora eres el autor principal del proyecto.`
      await crearNotificacion({
        userId: nuevoAutorPrincipal.user.id,
        tipo: 'TESIS_DESISTIMIENTO_COAUTOR',
        titulo: 'Ahora eres el autor principal',
        mensaje: mensajeNotif,
        enlace: `/mis-tesis/${id}`,
      })

      // Notificar asesores
      if (asesorIds.length > 0) {
        await crearNotificacion({
          userId: asesorIds,
          tipo: 'TESIS_DESISTIMIENTO_COAUTOR',
          titulo: 'Cambio de autor en tesis',
          mensaje: `${nombreDesistente} ha desistido de la tesis "${tesis.titulo}". ${nombreNuevoPrincipal} asume como autor principal. Motivo: ${motivo.trim()}`,
          enlace: `/mis-asesorias`,
        })
      }

      // Notificar a mesa de partes si necesita actualizar resolución
      if (necesitaRetroceder) {
        // Obtener usuarios de mesa de partes de la facultad
        const facultadId = tesis.autores[0]?.studentCareer?.facultad
        if (facultadId) {
          await crearNotificacion({
            userId: [nuevoAutorPrincipal.user.id], // Al menos al nuevo autor
            tipo: 'TESIS_REQUIERE_ACTUALIZACION',
            titulo: 'Resolución requiere actualización',
            mensaje: `La tesis "${tesis.titulo}" requiere una nueva resolución debido al desistimiento de ${nombreDesistente}. El proyecto retrocedió a la fase de asignación de jurados.`,
            enlace: `/mis-tesis/${id}`,
          })
        }
      }

      return NextResponse.json({
        message: nuevoEstado === 'BORRADOR'
          ? `Se ha registrado tu desistimiento. ${nombreNuevoPrincipal} continúa como autor principal. La tesis volvió a Borrador para que actualice los documentos.`
          : necesitaRetroceder
            ? `Se ha registrado tu desistimiento. ${nombreNuevoPrincipal} continúa como autor principal. La tesis retrocedió a fase de asignación de jurados para actualizar la resolución.`
            : `Se ha registrado tu desistimiento. ${nombreNuevoPrincipal} continúa como autor principal de la tesis. Puedes crear un nuevo proyecto.`,
      })
    } else {
      // ─── CASO 2: Es el único autor → la tesis pasa a DESISTIDA ───
      await prisma.$transaction(async (tx) => {
        // Marcar autor como DESISTIDO via SQL raw
        await tx.$executeRawUnsafe(
          `UPDATE thesis_authors SET estado = 'DESISTIDO', fecha_respuesta = NOW(), motivo_rechazo = $1 WHERE id = $2`,
          motivo.trim(), miRegistro.id
        )
        // Marcar tesis como DESISTIDA via SQL raw
        await tx.$executeRawUnsafe(
          `UPDATE thesis SET estado = 'DESISTIDA', updated_at = NOW() WHERE id = $1`,
          id
        )
        // Registrar en historial
        await tx.thesisStatusHistory.create({
          data: {
            thesisId: id,
            estadoAnterior: tesis.estado,
            estadoNuevo: 'DESISTIDA',
            comentario: `Desistimiento voluntario de ${nombreDesistente}. Motivo: ${motivo.trim()}`,
            changedById: user.id,
          },
        })
      })

      // Notificar asesores
      if (asesorIds.length > 0) {
        await crearNotificacion({
          userId: asesorIds,
          tipo: 'TESIS_DESISTIDA',
          titulo: 'Desistimiento de tesis',
          mensaje: `${nombreDesistente} ha desistido de la tesis "${tesis.titulo}". El proyecto ha sido dado de baja. Motivo: ${motivo.trim()}`,
          enlace: `/mis-asesorias`,
        })
      }

      return NextResponse.json({
        message: 'Se ha registrado el desistimiento de la tesis exitosamente. Puedes crear un nuevo proyecto de tesis.',
      })
    }
  } catch (error) {
    console.error('[Desistir tesis] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
