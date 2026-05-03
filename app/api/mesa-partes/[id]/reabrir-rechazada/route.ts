/**
 * POST /api/mesa-partes/[id]/reabrir-rechazada
 *
 * Válvula de escape: mesa de partes reabre una tesis que fue marcada como
 * RECHAZADA automáticamente por vencimiento de plazo de subsanación.
 *
 * Cubre casos de fuerza mayor (enfermedad, accidente, error administrativo)
 * documentados con el motivo. La tesis vuelve al estado anterior con un
 * plazo nuevo de 15 días calendario para terminar las correcciones.
 *
 * Requisitos:
 *  - Usuario con rol MESA_PARTES o admin.
 *  - Tesis en estado RECHAZADA.
 *  - El último cambio de estado en historial debe ser por vencimiento
 *    automático (no por rechazo manual de mesa-partes — eso es definitivo).
 *  - Motivo de la reapertura mínimo 30 caracteres.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { agregarDiasCalendario } from '@/lib/business-days'
import { crearNotificacion } from '@/lib/notificaciones'
import { isAutoRechazo } from '@/lib/thesis/auto-rechazo'

const Body = z.object({
  motivo: z.string().trim().min(30, 'El motivo debe tener al menos 30 caracteres').max(2000),
  diasPlazoNuevo: z.number().int().min(1).max(60).default(15),
})

const ROLES_PERMITIDOS = ['MESA_PARTES', 'SUPER_ADMIN', 'ADMIN']

const ESTADOS_PROYECTO_OBSERVADO = ['OBSERVADA', 'OBSERVADA_JURADO'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tesisId } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tieneRol = user.roles?.some((r) => ROLES_PERMITIDOS.includes(r.role.codigo) && r.isActive)
    if (!tieneRol) {
      return NextResponse.json(
        { error: 'Solo mesa de partes o admin pueden reabrir tesis rechazadas' },
        { status: 403 },
      )
    }

    const json = await request.json().catch(() => ({}))
    const parsed = Body.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 },
      )
    }

    const tesis = await prisma.thesis.findFirst({
      where: { id: tesisId, deletedAt: null },
      include: {
        autores: {
          where: { estado: 'ACEPTADO' },
          select: { userId: true },
        },
        historialEstados: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
    if (!tesis) return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })

    if (tesis.estado !== 'RECHAZADA') {
      return NextResponse.json(
        {
          error: `Solo se puede reabrir una tesis en estado RECHAZADA. Estado actual: ${tesis.estado}.`,
          code: 'ESTADO_INVALIDO',
        },
        { status: 409 },
      )
    }

    // Verificar que el rechazo fue automático por vencimiento (no rechazo manual).
    // El cron prefija el comentario con AUTO_RECHAZO_MARKER.
    const ultimoCambio = tesis.historialEstados[0]
    if (
      !ultimoCambio ||
      ultimoCambio.estadoNuevo !== 'RECHAZADA' ||
      !isAutoRechazo(ultimoCambio.comentario)
    ) {
      return NextResponse.json(
        {
          error:
            'Esta tesis no fue rechazada por vencimiento automático. La reapertura solo aplica a casos de auto-rechazo.',
          code: 'NO_ES_AUTORECHAZO',
        },
        { status: 409 },
      )
    }

    // Determinar a qué estado regresar: usar el estado ANTERIOR al rechazo.
    const estadoAnterior = ultimoCambio.estadoAnterior
    if (
      !estadoAnterior ||
      !ESTADOS_PROYECTO_OBSERVADO.includes(estadoAnterior as typeof ESTADOS_PROYECTO_OBSERVADO[number])
    ) {
      return NextResponse.json(
        {
          error: `Estado anterior inesperado (${estadoAnterior}). No se puede reabrir.`,
          code: 'ESTADO_ANTERIOR_INVALIDO',
        },
        { status: 409 },
      )
    }
    const estadoDestino = estadoAnterior as typeof ESTADOS_PROYECTO_OBSERVADO[number]

    const diasNuevos = parsed.data.diasPlazoNuevo
    const fechaLimiteNueva = agregarDiasCalendario(new Date(), diasNuevos)

    await prisma.$transaction([
      prisma.thesis.update({
        where: { id: tesisId },
        data: {
          estado: estadoDestino,
          fechaLimiteCorreccion: fechaLimiteNueva,
        },
      }),
      prisma.thesisStatusHistory.create({
        data: {
          thesisId: tesisId,
          estadoAnterior: 'RECHAZADA',
          estadoNuevo: estadoDestino,
          comentario: `Reapertura excepcional autorizada por mesa de partes. Motivo: ${parsed.data.motivo} | Plazo nuevo: ${diasNuevos} días calendario, hasta ${fechaLimiteNueva.toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}.`,
          changedById: user.id,
        },
      }),
    ])

    // Notificar a tesistas
    try {
      const userIds = tesis.autores.map((a) => a.userId)
      if (userIds.length > 0) {
        await crearNotificacion({
          userId: userIds,
          tipo: 'TESIS_OBSERVADA',
          titulo: 'Trámite reabierto por mesa de partes',
          mensaje: `Tu tesis "${tesis.titulo}" fue reabierta. Tienes hasta el ${fechaLimiteNueva.toLocaleDateString('es-PE', { timeZone: 'America/Lima' })} para presentar las correcciones.`,
          enlace: `/mis-tesis/${tesisId}`,
        })
      }
    } catch (e) {
      console.error('[reabrir-rechazada] error notif:', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Tesis reabierta. El tesista tiene plazo nuevo para corregir.',
      data: {
        nuevoEstado: estadoDestino,
        fechaLimiteCorreccion: fechaLimiteNueva.toISOString(),
        diasPlazo: diasNuevos,
      },
    })
  } catch (error) {
    console.error('[POST /reabrir-rechazada]', error)
    return NextResponse.json({ error: 'Error al reabrir tesis' }, { status: 500 })
  }
}
