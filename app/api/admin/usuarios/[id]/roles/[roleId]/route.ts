import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { userService } from '@/lib/admin/services/user.service'
import { AdminError } from '@/lib/admin/types'
import { requirePermission } from '@/lib/admin/require-permission'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const auth = await requirePermission(request, 'usuarios', 'edit')
    if (auth instanceof NextResponse) return auth

    const { id, roleId } = await params
    const body = await request.json()
    const { contextType, contextId } = body

    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: id,
        roleId: roleId,
        isActive: true,
      },
    })

    if (!userRole) {
      return NextResponse.json(
        { success: false, error: 'Asignación de rol no encontrada' },
        { status: 404 }
      )
    }

    await prisma.userRole.update({
      where: { id: userRole.id },
      data: {
        contextType: contextType || null,
        contextId: contextId || null,
      },
    })

    const user = await userService.getById(id)

    return NextResponse.json({
      success: true,
      data: user,
      message: 'Contexto del rol actualizado correctamente',
    })
  } catch (error) {
    console.error('[PATCH /api/admin/usuarios/[id]/roles/[roleId]] Error:', error)

    if (error instanceof AdminError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const auth = await requirePermission(request, 'usuarios', 'edit')
    if (auth instanceof NextResponse) return auth

    const { id, roleId } = await params
    const user = await userService.removeRole(id, roleId, auth.userId)

    return NextResponse.json({
      success: true,
      data: user,
      message: 'Rol removido correctamente',
    })
  } catch (error) {
    console.error('[DELETE /api/admin/usuarios/[id]/roles/[roleId]] Error:', error)

    if (error instanceof AdminError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
