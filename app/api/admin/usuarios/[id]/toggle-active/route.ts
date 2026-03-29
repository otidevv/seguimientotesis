import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/admin/services/user.service'
import { AdminError } from '@/lib/admin/types'
import { requirePermission } from '@/lib/admin/require-permission'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'usuarios', 'edit')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const user = await userService.toggleActive(id, auth.userId)

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
