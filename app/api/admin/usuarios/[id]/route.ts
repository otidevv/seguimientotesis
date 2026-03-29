import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/admin/services/user.service'
import { AdminError } from '@/lib/admin/types'
import { updateUserSchema } from '@/lib/validators/user.schema'
import { requirePermission } from '@/lib/admin/require-permission'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'usuarios', 'view')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const user = await userService.getById(id)

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('[GET /api/admin/usuarios/[id]] Error:', error)

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'usuarios', 'edit')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const result = updateUserSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const user = await userService.update(id, result.data, auth.userId)

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('[PUT /api/admin/usuarios/[id]] Error:', error)

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'usuarios', 'delete')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    await userService.delete(id, auth.userId)

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado correctamente',
    })
  } catch (error) {
    console.error('[DELETE /api/admin/usuarios/[id]] Error:', error)

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
