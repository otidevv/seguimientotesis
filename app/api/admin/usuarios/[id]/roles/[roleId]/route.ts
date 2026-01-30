import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/admin/services/user.service'
import { AdminError } from '@/lib/admin/types'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const adminId = request.headers.get('x-user-id')
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { id, roleId } = await params
    const user = await userService.removeRole(id, roleId, adminId)

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
