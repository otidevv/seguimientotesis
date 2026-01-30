import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/admin/services/user.service'
import { AdminError } from '@/lib/admin/types'
import { updateUserSchema } from '@/lib/validators/user.schema'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const adminId = request.headers.get('x-user-id')
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const result = updateUserSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const user = await userService.update(id, result.data, adminId)

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
    const adminId = request.headers.get('x-user-id')
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    await userService.delete(id, adminId)

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado correctamente',
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
