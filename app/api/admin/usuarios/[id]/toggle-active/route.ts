import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/admin/services/user.service'
import { AdminError } from '@/lib/admin/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = request.headers.get('x-user-id')
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const user = await userService.toggleActive(id, adminId)

    return NextResponse.json({
      success: true,
      data: user,
      message: user.isActive ? 'Usuario activado' : 'Usuario desactivado',
    })
  } catch (error) {
    console.error('[POST /api/admin/usuarios/[id]/toggle-active] Error:', error)

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
