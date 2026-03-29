import { NextRequest, NextResponse } from 'next/server'
import { roleService } from '@/lib/admin/services/role.service'
import { AdminError } from '@/lib/admin/types'
import { updateRoleSchema } from '@/lib/validators/role.schema'
import { requirePermission } from '@/lib/admin/require-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission(request, 'roles', 'view')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const role = await roleService.getById(id)

    return NextResponse.json({
      success: true,
      data: role,
    })
  } catch (error) {
    console.error('[GET /api/admin/roles/[id]] Error:', error)

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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission(request, 'roles', 'edit')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await request.json()
    const result = updateRoleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const role = await roleService.update(id, result.data, auth.userId)

    return NextResponse.json({
      success: true,
      data: role,
    })
  } catch (error) {
    console.error('[PUT /api/admin/roles/[id]] Error:', error)

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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requirePermission(request, 'roles', 'delete')
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    await roleService.delete(id, auth.userId)

    return NextResponse.json({
      success: true,
      message: 'Rol eliminado correctamente',
    })
  } catch (error) {
    console.error('[DELETE /api/admin/roles/[id]] Error:', error)

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
