import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/admin/services/user.service'
import { AdminError } from '@/lib/admin/types'
import { assignRoleSchema } from '@/lib/validators/user.schema'
import { requirePermission } from '@/lib/admin/require-permission'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'usuarios', 'edit')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const result = assignRoleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const user = await userService.assignRole(id, result.data, auth.userId)

    return NextResponse.json({
      success: true,
      data: user,
      message: 'Rol asignado correctamente',
    })
  } catch (error) {
    console.error('[POST /api/admin/usuarios/[id]/roles] Error:', error)

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
