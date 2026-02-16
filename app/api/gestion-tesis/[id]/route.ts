import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { EstadoTesis } from '@prisma/client'

const ESTADOS_VALIDOS: EstadoTesis[] = [
  'BORRADOR',
  'EN_REVISION',
  'OBSERVADA',
  'ASIGNANDO_JURADOS',
  'EN_EVALUACION_JURADO',
  'OBSERVADA_JURADO',
  'PROYECTO_APROBADO',
  'INFORME_FINAL',
  'EN_EVALUACION_INFORME',
  'OBSERVADA_INFORME',
  'APROBADA',
  'EN_SUSTENTACION',
  'SUSTENTADA',
  'ARCHIVADA',
  'RECHAZADA',
]

async function verificarAdmin(request: NextRequest) {
  const user = await getCurrentUser(request)

  if (!user) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }), user: null }
  }

  const tieneAcceso = user.roles?.some(
    (r) => ['ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
  )

  if (!tieneAcceso) {
    return { error: NextResponse.json({ error: 'No tienes permisos para esta accion' }, { status: 403 }), user: null }
  }

  return { error: null, user }
}

// PATCH /api/gestion-tesis/[id] - Cambiar estado de una tesis
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await verificarAdmin(request)
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { accion, nuevoEstado, comentario } = body

    // Obtener tesis actual
    const tesis = await prisma.thesis.findUnique({
      where: { id },
      select: { id: true, estado: true, deletedAt: true },
    })

    if (!tesis) {
      return NextResponse.json(
        { error: 'Tesis no encontrada' },
        { status: 404 }
      )
    }

    // Accion: RESTAURAR (revertir soft delete)
    if (accion === 'RESTAURAR') {
      if (!tesis.deletedAt) {
        return NextResponse.json(
          { error: 'La tesis no esta eliminada' },
          { status: 400 }
        )
      }

      await prisma.thesis.update({
        where: { id },
        data: { deletedAt: null },
      })

      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: id,
          estadoAnterior: tesis.estado,
          estadoNuevo: tesis.estado,
          comentario: comentario?.trim() || 'Tesis restaurada por administrador',
          changedById: user!.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Tesis restaurada correctamente',
        data: { id: tesis.id, estado: tesis.estado },
      })
    }

    // Accion: CAMBIAR_ESTADO
    if (accion !== 'CAMBIAR_ESTADO') {
      return NextResponse.json(
        { error: 'Accion no valida' },
        { status: 400 }
      )
    }

    if (!nuevoEstado || !ESTADOS_VALIDOS.includes(nuevoEstado as EstadoTesis)) {
      return NextResponse.json(
        { error: 'Estado no valido' },
        { status: 400 }
      )
    }

    if (tesis.deletedAt) {
      return NextResponse.json(
        { error: 'No se puede modificar una tesis eliminada. Restaurala primero.' },
        { status: 400 }
      )
    }

    if (tesis.estado === nuevoEstado) {
      return NextResponse.json(
        { error: 'La tesis ya se encuentra en ese estado' },
        { status: 400 }
      )
    }

    // Actualizar estado
    const tesisActualizada = await prisma.thesis.update({
      where: { id },
      data: { estado: nuevoEstado as EstadoTesis },
    })

    // Registrar en historial
    await prisma.thesisStatusHistory.create({
      data: {
        thesisId: id,
        estadoAnterior: tesis.estado,
        estadoNuevo: nuevoEstado as EstadoTesis,
        comentario: comentario?.trim() || `Estado cambiado manualmente por administrador`,
        changedById: user!.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Estado actualizado correctamente',
      data: {
        id: tesisActualizada.id,
        estadoAnterior: tesis.estado,
        estadoNuevo: nuevoEstado,
      },
    })
  } catch (error) {
    console.error('[PATCH /api/gestion-tesis/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la tesis' },
      { status: 500 }
    )
  }
}

// DELETE /api/gestion-tesis/[id] - Soft delete de una tesis
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await verificarAdmin(request)
    if (error) return error

    const { id } = await params

    // Obtener tesis actual
    const tesis = await prisma.thesis.findUnique({
      where: { id },
      select: { id: true, estado: true, deletedAt: true },
    })

    if (!tesis) {
      return NextResponse.json(
        { error: 'Tesis no encontrada' },
        { status: 404 }
      )
    }

    if (tesis.deletedAt) {
      return NextResponse.json(
        { error: 'La tesis ya fue eliminada' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.thesis.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    // Registrar en historial
    await prisma.thesisStatusHistory.create({
      data: {
        thesisId: id,
        estadoAnterior: tesis.estado,
        estadoNuevo: tesis.estado,
        comentario: 'Tesis eliminada por administrador',
        changedById: user!.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Tesis eliminada correctamente',
    })
  } catch (error) {
    console.error('[DELETE /api/gestion-tesis/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la tesis' },
      { status: 500 }
    )
  }
}
