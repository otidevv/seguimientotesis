import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/admin/services/user.service'
import { AdminError } from '@/lib/admin/types'
import { assignRoleSchema } from '@/lib/validators/user.schema'

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
    const body = await request.json()
    const result = assignRoleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const user = await userService.assignRole(id, result.data, adminId)

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
